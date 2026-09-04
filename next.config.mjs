/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 es un modulo nativo: no debe empaquetarse por webpack/turbopack.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
