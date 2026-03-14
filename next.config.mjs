/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
