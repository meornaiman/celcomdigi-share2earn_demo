import type { NextConfig } from "next";

/**
 * The app ships as a fully static export so it can be hosted on GitHub Pages.
 * On a project site the app is served from https://<user>.github.io/<repo>, so
 * every asset and route needs to be prefixed. The deploy workflow sets
 * NEXT_PUBLIC_BASE_PATH; local development leaves it empty and serves from "/".
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Emits /route/index.html instead of /route.html, which is what GitHub Pages
  // needs to resolve nested routes without a server rewriting URLs.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
