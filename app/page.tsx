import type { Metadata } from "next";
import { DealExplorer } from "./components/DealExplorer";

export const metadata: Metadata = {
  title: "Chollos del día: ofertas, cupones y descuentos verificados",
  description:
    "Descubre chollos y cupones seleccionados de Amazon, AliExpress y otras tiendas. Ofertas claras, ahorro real y enlaces directos.",
  alternates: { canonical: "/" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ChollosAlDía",
  url: "https://chollosaldia.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://chollosaldia.com/?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo seleccionáis los chollos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Revisamos el descuento, el precio anterior, la utilidad del producto y la disponibilidad antes de publicar una oferta.",
      },
    },
    {
      "@type": "Question",
      name: "¿Los precios pueden cambiar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Los precios y cupones dependen de cada tienda y pueden cambiar o agotarse sin previo aviso.",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <DealExplorer />
    </>
  );
}
