import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://chollosaldia.es"),
  title: { default: "ChollosAlDía | Ofertas y cupones que merecen la pena", template: "%s | ChollosAlDía" },
  description: "Ofertas, cupones y bajadas de precio seleccionadas a diario en Amazon, AliExpress y más tiendas.",
  applicationName: "ChollosAlDía",
  keywords: ["chollos", "ofertas", "cupones", "descuentos", "Amazon", "AliExpress"],
  authors: [{ name: "ChollosAlDía" }],
  creator: "ChollosAlDía",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "ChollosAlDía",
    title: "ChollosAlDía | Menos precio. Más alegría.",
    description: "Chollos, cupones y bajadas de precio seleccionadas cada día.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "ChollosAlDía, ofertas seleccionadas cada día" }],
  },
  twitter: { card: "summary_large_image", title: "ChollosAlDía", description: "Ofertas que sí merecen la pena.", images: ["/og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  category: "shopping",
};

export const viewport: Viewport = { themeColor: "#ff4d24", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
