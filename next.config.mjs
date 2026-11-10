/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  reactStrictMode: true,
  typescript: {
    // TypeScript é validado estritamente via `npm run build` (tsc)
    // para evitar estouro de memória no tsgo durante build do Next.js
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
