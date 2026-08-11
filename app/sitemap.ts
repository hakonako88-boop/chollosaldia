import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/aviso-legal", "/privacidad", "/afiliacion"].map((path) => ({ url: `https://chollosaldia.com${path}`, lastModified: new Date(), changeFrequency: path ? "monthly" : "daily", priority: path ? 0.4 : 1 })); }
