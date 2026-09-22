/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["pdfjs-dist"]
  }
};

export default nextConfig;

