import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Stethoscope, ArrowLeft } from "lucide-react";

interface LegalPageViewProps {
  slug: "privacy" | "terms" | "cookies" | "lgpd";
  defaultTitle: string;
}

export async function LegalPageView({ slug, defaultTitle }: LegalPageViewProps) {
  const page = await prisma.legalPage.findUnique({
    where: { id: slug },
  });

  const site = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });

  const title = page?.title || defaultTitle;
  const content = page?.contentHtml || "<p>Conteúdo em atualização pelo consultório.</p>";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-teal-700 dark:text-teal-400">
            <Stethoscope className="h-6 w-6" />
            <span>{site?.clinicName || "PSI Consultório"}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Início</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 py-12 flex-1">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-xs">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-6">
            {title}
          </h1>
          <div
            className="prose dark:prose-invert max-w-none space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {site?.clinicName}. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:underline">Privacidade</Link>
            <Link href="/termos" className="hover:underline">Termos</Link>
            <Link href="/cookies" className="hover:underline">Cookies</Link>
            <Link href="/lgpd" className="hover:underline">LGPD</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
