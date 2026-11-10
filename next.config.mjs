/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  reactStrictMode: true,
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
