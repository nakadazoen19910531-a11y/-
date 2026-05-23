import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';

const Home: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to construction plan creation page
    router.push('/plans/create');
  }, [router]);

  return (
    <Head>
      <title>施工計画書自動作成システム</title>
    </Head>
  );
};

export default Home;
