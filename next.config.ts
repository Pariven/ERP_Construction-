import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB request body — too small for a real
    // phone/camera photo ("Change photo") or a scanned drawing/contract PDF
    // (Documents tab).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
