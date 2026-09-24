/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/parse-analitico": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
      "/api/admin/import/fda": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"]
    }
  }
};

export default nextConfig;

