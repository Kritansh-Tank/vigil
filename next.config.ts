import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use native Node.js features — must run server-side only
  serverExternalPackages: [
    "@xenova/transformers",
    "mongodb",
    "pdfkit",
  ],

  // Allow Vercel to inline the app into a single output
  output: "standalone",
};

export default nextConfig;
