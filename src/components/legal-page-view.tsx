import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sanitizeCustomHtml } from "@/lib/sanitize";
import { CookieBanner } from "@/components/cookie-consent/cookie-banner";
import { CookiePreferencesTrigger } from "@/components/cookie-consent/cookie-preferences-trigger";
import { Stethoscope, ArrowLeft, AlertTriangle } from "lucide-react";

interface LegalPageViewProps {
  slug: "privacy" | "terms" | "cookies" | "lgpd" | "ethics";
  defaultTitle: string;
}

export async function LegalPageView({ slug, defaultTitle }: LegalPageViewProps) {
  // Busca a página solicitada
  const page = await prisma.legalPage.findUnique({
    where: { id: slug },
  });

  // Busca configurações de identidade visual e clínica
  const site = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });

  // Busca páginas publicadas para exibição condicional no rodapé
  const publishedPages = await prisma.legalPage.findMany({
    where: { isPublished: true },
    select: { id: true, title: true },
  });
  const publishedIds = new Set(publishedPages.map((p) => p.id));

  const isPublished = page?.isPublished ?? true;
  const title = page?.title || defaultTitle;
  const rawContent = page?.contentHtml || "<p>Conteúdo em atualização pelo consultório.</p>";
  const cleanContent = sanitizeCustomHtml(rawContent);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F8F8] text-[#171717]">
      {/* ================= CABEÇALHO PÚBLICO (SEMPRE LIGHT MODE) ================= */}
      <header className="border-b border-[#E5E5E5] bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[var(--primary)] hover:opacity-90 transition-opacity">
            {site?.logoHorizontalUrl ? (
              <img
                src={site.logoHorizontalUrl}
                alt={site?.clinicName || "Consultório"}
                className="h-8 max-h-8 w-auto object-contain"
              />
            ) : site?.logoUrl ? (
              <img
                src={site.logoUrl}
                alt={site?.clinicName || "Consultório"}
                className="h-8 max-h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Stethoscope className="h-6 w-6" />
                <span className="font-heading">{site?.clinicName || "Consultório Clínico"}</span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Início</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= CORPO PRINCIPAL ================= */}
      <main className="max-w-4xl mx-auto w-full px-4 py-10 sm:py-14 flex-1">
        <div className="bg-white rounded-3xl border border-[#E5E5E5] p-7 sm:p-12 shadow-sm">
          {isPublished ? (
            <>
              <div className="border-b border-slate-100 pb-6 mb-8">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-[#171717]">
                  {title}
                </h1>
                {page?.description && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    {page.description}
                  </p>
                )}
                {page?.updatedAt && (
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">
                    Última atualização: {new Date(page.updatedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              <div
                className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: cleanContent }}
              />
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-800">Página em Elaboração</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Este documento informativo está temporariamente em revisão pelo consultório e será publicado em breve.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retornar ao Site</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= RODAPÉ DA PÁGINA INFORMATIVA ================= */}
      <footer className="border-t border-[#E5E5E5] py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          <p className="text-center sm:text-left text-[11px]">
            &copy; {new Date().getFullYear()} {site?.clinicName || "Consultório"}. Todos os direitos reservados.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 text-xs font-medium">
            <Link href="/termos-de-uso" className="hover:text-[var(--primary)] hover:underline">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--primary)] hover:underline">
              Política de Privacidade
            </Link>
            <Link href="/protecao-de-dados" className="hover:text-[var(--primary)] hover:underline">
              Proteção de Dados (LGPD)
            </Link>
            {publishedIds.has("ethics") && (
              <Link href="/etica-profissional" className="hover:text-[var(--primary)] hover:underline">
                Ética Profissional
              </Link>
            )}
            <CookiePreferencesTrigger />
          </div>
        </div>
      </footer>

      {/* ================= BANNER DE CONSENTIMENTO DE COOKIES ================= */}
      <CookieBanner />
    </div>
  );
}
