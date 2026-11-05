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
      --color-primary: ${primary};
      --color-primary-hover: ${buttonBg};
      --color-secondary: ${secondary};
      --color-accent: ${accent};
      --color-background: ${bgColor};
      --color-surface: #ffffff;
      --color-text: ${textColor};
      --color-text-muted: #64748b;
      --color-border: #e2e8f0;
    }
    .dark {
      --primary: ${primary};
      --button-bg: ${buttonBg};
      --ring: ${primary};
      --color-primary: ${primary};
      --color-primary-hover: ${buttonBg};
      --color-secondary: #353535;
      --color-accent: #353535;
      --color-background: #202020;
      --color-surface: #2D2D2D;
      --color-text: #F5F5F5;
      --color-text-muted: #BDBDBD;
      --color-border: #444444;
    }
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {site?.faviconUrl && <link rel="icon" href={site.faviconUrl} />}
        <style id="psi-theme-vars" dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-[#F5F5F5] antialiased selection:bg-[var(--primary)] selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
