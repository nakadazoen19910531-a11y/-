import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import '@/styles/globals.css';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Routes that don't need the main layout
  const noLayoutRoutes = ['/auth/login', '/auth/register', '/login', '/register', '/404', '/500'];
  const shouldShowLayout = !noLayoutRoutes.includes(router.pathname);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        <title>施工計画書自動作成システム</title>
        <meta name="description" content="公共工事の施工計画書を簡単に自動作成できるシステム" />
      </Head>

      <AuthProvider>
        {shouldShowLayout ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : (
          <Component {...pageProps} />
        )}
      </AuthProvider>
    </>
  );
}
