
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/mod",
        "/studio",
        "/settings",
      ],
    },
    sitemap: "https://asteroidgamingcloud.dpdns.org/sitemap.xml",
  };
}
