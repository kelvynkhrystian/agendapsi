import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { prisma } from "@/lib/prisma";
import { calculateContrastRatio } from "@/lib/theme-presets";
import "./globals.css";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
  const secondary = site?.secondaryColor || "#f2f2f2";
  const accent = site?.accentColor || "#f0fdfa";
  const buttonBg = site?.buttonColor || primary;
  const bgColor = site?.backgroundColor || "#f8f8f8";
  const textColor = site?.textColor || "#171717";

  // Cálculo automático de contraste acessível para o texto do botão primário (evita dark blue-gray)
  const buttonForeground = calculateContrastRatio("#ffffff", buttonBg) >= 4.5 ? "#ffffff" : "#111111";

  const dynamicCss = `
    :root {
      --primary: ${primary};
      --primary-foreground: ${buttonForeground};
      --secondary: ${secondary};
      --accent: ${accent};
      --button-bg: ${buttonBg};
      --button-fg: ${buttonForeground};
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
      --color-text-muted: #737373;
      --color-border: #e5e5e5;
    }
    .dark, [data-theme="dark"] {
      --primary: ${primary};
      --primary-foreground: ${buttonForeground};
      --button-bg: ${buttonBg};
      --button-fg: ${buttonForeground};
      --ring: ${primary};
      --color-primary: ${primary};
      --color-primary-hover: ${buttonBg};
      --color-secondary: #242424;
      --color-accent: #242424;
      --color-background: #080808;
      --color-surface: #191919;
      --color-text: #f5f5f5;
      --color-text-secondary: #cccccc;
      --color-text-muted: #a6a6a6;
      --color-border: #333333;
    }
  `;

  return (
    <html lang="pt-BR" className={`${headingFont.variable} ${sansFont.variable}`} suppressHydrationWarning>
      <head>
        {site?.faviconUrl && <link rel="icon" href={site.faviconUrl} />}
        <style id="psi-theme-vars" dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      </head>
      <body className="min-h-screen bg-[#F8F8F8] dark:bg-[#080808] text-[#171717] dark:text-[#F5F5F5] antialiased selection:bg-[var(--primary)] selection:text-white">
        <Script
          id="psi-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var isAuth = path.startsWith('/admin') || path.startsWith('/paciente');
                  if (isAuth) {
                    var key = path.startsWith('/admin') ? 'psi_theme_admin' : 'psi_theme_patient';
                    var saved = localStorage.getItem(key) || localStorage.getItem('psi_theme');
                    var isDark = saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-theme', 'light');
                    }
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
