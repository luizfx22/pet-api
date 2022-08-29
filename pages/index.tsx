import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Pet API</title>
        <meta
          name="description"
          content="API para informações úteis sobre PETS"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Bem-vindo à PET API, aqui você encontrará algumas informações úteis
          sobre PETS
        </h1>

        <p className={styles.description}>
          As informações disponíveis aqui foram coletadas de páginas públicas,
          mais informações na página de <a href="creditos">créditos</a>.
        </p>

        <div className={styles.grid}>
          <a href="https://nextjs.org/docs" className={styles.card}>
            <h2>Rotas disponíveis: &rarr;</h2>
            <p>Find in-depth information about Next.js features and API.</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
}
