import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://pec5a-kaysv2-hm7i.vercel.app"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/setup", "/config"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
