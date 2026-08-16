import type { MetadataRoute } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Required for metadata routes under `output: "export"`. */
export const dynamic = "force-static";

/**
 * Emitted as a static /manifest.webmanifest by the export. Paths are written
 * with the deploy base path so installing works from a GitHub Pages subpath.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CelcomDigi Share2Earn",
    short_name: "Share2Earn",
    description:
      "Ask someone you trust for help with a CelcomDigi task. You always approve before anything happens.",
    start_url: `${basePath}/home/`,
    scope: `${basePath}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F7FD",
    theme_color: "#082B75",
    lang: "en-MY",
    categories: ["utilities", "productivity"],
    icons: [
      {
        src: `${basePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
