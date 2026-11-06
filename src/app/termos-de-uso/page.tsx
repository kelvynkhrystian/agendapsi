import { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page-view";

export const metadata: Metadata = {
  title: "Termos de Uso | PSI",
  description: "Termos de uso, agendamentos e políticas do consultório.",
};

export default function TermosDeUsoPage() {
  return <LegalPageView slug="terms" defaultTitle="Termos de Uso e Regras de Atendimento" />;
}
