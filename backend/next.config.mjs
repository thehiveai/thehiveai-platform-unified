import path from "path";

const nextConfig = {
  experimental: { externalDir: true },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@shared": path.resolve(__dirname, "../shared"),
    };
    return config;
  },
};

export default nextConfig;
