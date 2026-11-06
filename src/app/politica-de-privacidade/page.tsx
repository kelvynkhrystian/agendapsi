import { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page-view";

export const metadata: Metadata = {
  title: "Política de Privacidade | PSI",
  description: "Política de privacidade, tratamento de dados pessoais e gestão de cookies do consultório.",
};

export default function PoliticaPrivacidadePage() {
  return <LegalPageView slug="privacy" defaultTitle="Política de Privacidade e Cookies" />;
}
