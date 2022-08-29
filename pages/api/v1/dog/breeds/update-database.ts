import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { load as CheerioLoad } from "cheerio";
import axios from "axios";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface IDogBreed {
  description: string;
  animal_type: number;
  wiki_url: string;
  meaning: string;
  fci_classification: string;
  extra?: {
    known_countries?: Array<string>;
    ancestry?: string;
    image_url?: {
      original: string;
      normalized: string;
    };
    last_update?: string;
  };
}

async function findDogBreedsInWikipedia(): Promise<Array<IDogBreed>> {
  function removeExcessiveSpacing(text: string): string {
    return text.trim().replace(/\n/g, "").replace(/\s\s+/g, " ");
  }

  let file = await axios.get(
    "https://pt.wikipedia.org/wiki/Ra%C3%A7as_de_c%C3%A3es_por_ordem_alfab%C3%A9tica"
  );

  file = file.data;

  const $ = CheerioLoad(file as any);

  const breeds: Array<IDogBreed> = [];

  $(".NavFrame").each((_, el) => {
    $(el)
      .children(".NavContent")
      .children()
      .each((_, child) => {
        for (const ch of $($($(child).children()[0]).children())) {
          const rac = String($($(ch).children()[0]).text()).trim(); // Raça
          const poi = String($($(ch).children()[1]).text()).trim(); // País origem
          const sig = String($($(ch).children()[2]).text()).trim(); // Significado
          const anc = String($($(ch).children()[3]).text()).trim(); // Ancestrais
          const fci = String($($(ch).children()[4]).text()).trim(); // Classificação FCI

          if (
            rac === "Raça" ||
            poi === "País origem" ||
            sig === "Significado" ||
            anc === "Ancestrais" ||
            fci === "Classificação FCI"
          )
            continue;

          // País
          const countries = [];

          $($(ch).children()[1])
            .children()
            .each((_, origens) => {
              const text = removeExcessiveSpacing($(origens).text());
              if (text === "") return;
              countries.push(text);
            });

          // Wiki link
          const wki = String($($($(ch).children()[0]).children()[0]).attr("href"));

          // Imagem
          const bareLink = $($($($(ch).children()[5]).children()[0]).children()).attr("src");
          const img = !bareLink ? "" : "https:" + bareLink;

          // Regex to replace number before 'px' in string
          const imageNormalized = img.replace(/(\d+)(px)/g, "950px");

          const breed: IDogBreed = {
            description: removeExcessiveSpacing(String(rac)),
            animal_type: 1,
            wiki_url: wki !== "undefined" ? `https://pt.wikipedia.org${wki}` : "Não encontrado",
            meaning: removeExcessiveSpacing(String(sig)).replace(/\"/gm, ""),
            fci_classification: removeExcessiveSpacing(String(fci)),
            extra: {
              known_countries: countries,
              ancestry: removeExcessiveSpacing(String(anc)),
              image_url: {
                original: img,
                normalized: imageNormalized,
              },
              last_update: new Date().toISOString(),
            },
          };

          breeds.push(breed);
        }
      });
  });

  return breeds;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req?.method !== "POST")
    return res.status(400).json({
      error: "Invalid method, use POST instead!",
    });

  if (!req.body?.auth && (!req.body?.auth?.email || !req.body?.auth?.password))
    return res.status(400).json({
      error: "Invalid body! Lacking auth credentials!",
    });

  const result = await client.auth.signIn(req.body?.auth).catch((e) => {
    return res.status(500).json({ ...e });
  });

  if (!result || result?.error !== null || result?.session?.user === null)
    return res.status(401).json({ ...result });

  const dbBreeds = await client.from<IDogBreed>("breeds").select("*");

  const minedBreeds = await findDogBreedsInWikipedia();

  if (dbBreeds?.data?.length === 0) {
    try {
      const result = await client.from<IDogBreed>("breeds").insert(minedBreeds);

      return res.status(201).json({ ...result });

      //
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  for (const breed of dbBreeds.data) {
    // Find breed in minedBreeds and update if necessary
    const foundBreed = minedBreeds.find((b) => b.description === breed.description);
    if (foundBreed) {
      try {
        const result = await client
          .from<IDogBreed>("breeds")
          .update(foundBreed)
          .eq("description", foundBreed.description);

        return res.status(200).json({ ...result.data });

        //
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    // If breed is not found in minedBreeds, insert in database
    try {
      const result = await client.from<IDogBreed>("breeds").insert(breed);

      return res.status(201).json({ ...result.data });

      //
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(200).json({ mined: minedBreeds, error: "DB not updated!" });
}
