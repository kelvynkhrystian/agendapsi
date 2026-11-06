import { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page-view";

export const metadata: Metadata = {
  title: "Proteção de Dados (LGPD) | PSI",
  description: "Tratamento de dados pessoais sensíveis e direitos do titular sob a Lei Geral de Proteção de Dados.",
};

export default function ProtecaoDadosPage() {
  return <LegalPageView slug="lgpd" defaultTitle="Proteção de Dados Pessoais (LGPD)" />;
}
