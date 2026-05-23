/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // /api/* → バックエンド API へのプロキシ
  // NEXT_PUBLIC_API_URL が設定されていればそちら（Vercel 本番）
  // 未設定の場合はローカルの Flask (localhost:5000)
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
      : 'http://localhost:5000/api/:path*';

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: apiBase,
        },
      ],
    };
  },

  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  compress: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
