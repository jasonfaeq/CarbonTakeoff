import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tailwind through the turbopack loader instead of postcss, same as the 16.4 template
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
