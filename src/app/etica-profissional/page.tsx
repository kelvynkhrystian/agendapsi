import { Metadata } from "next";
import { LegalPageView } from "@/components/legal-page-view";

export const metadata: Metadata = {
  title: "Ética Profissional | PSI",
  description: "Princípios éticos, sigilo profissional e conformidade com o Conselho Federal de Psicologia (CFP).",
};

export default function EticaProfissionalPage() {
  return <LegalPageView slug="ethics" defaultTitle="Ética Profissional e Sigilo Terapêutico" />;
}
