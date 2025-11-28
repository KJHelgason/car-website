import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // tells Next.js to make a static export
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
