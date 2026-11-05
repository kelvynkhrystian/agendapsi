import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const site = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const clinicName = site?.clinicName || "PSI — Gestão de Consultórios";
    return {
      title: `${clinicName} de Psicologia e Psiquiatria`,
      description:
        "Sistema completo e seguro para gestão de consultórios, agendamentos, prontuários eletrônicos e teleconsultas.",
      icons: site?.faviconUrl ? [{ rel: "icon", url: site.faviconUrl }] : undefined,
    };
  } catch {
    return {
      title: "PSI — Gestão de Consultórios de Psicologia e Psiquiatria",
      description:
        "Sistema completo e seguro para gestão de consultórios, agendamentos, prontuários eletrônicos e teleconsultas.",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let site = null;
  try {
    site = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  } catch {
    // Fail gracefully if DB connection is unavailable during build
  }

  const primary = site?.primaryColor || "#0d9488";
  const secondary = site?.secondaryColor || "#f1f5f9";
  const accent = site?.accentColor || "#f0fdfa";
  const buttonBg = site?.buttonColor || primary;
  const bgColor = site?.backgroundColor || "#f8fafc";
  const textColor = site?.textColor || "#0f172a";

  const dynamicCss = `
    :root {
      --primary: ${primary};
      --primary-foreground: #ffffff;
      --secondary: ${secondary};
      --accent: ${accent};
      --button-bg: ${buttonBg};
      --ring: ${primary};
      --theme-bg: ${bgColor};
      --theme-text: ${textColor};
    }
    .dark {
      --primary: ${primary};
      --button-bg: ${buttonBg};
      --ring: ${primary};
    }
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {site?.faviconUrl && <link rel="icon" href={site.faviconUrl} />}
        <style id="psi-theme-vars" dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-[var(--primary)] selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
