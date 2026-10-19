import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SDK loads native binaries at runtime; bundling it breaks the import.
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
