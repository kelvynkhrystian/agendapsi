import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Heart,
  Video,
  Sparkles,
} from "lucide-react";

export default async function HomePage() {
  const [site, profile, services] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.professionalProfile.findUnique({ where: { id: "default" } }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  const clinicName = site?.clinicName || "Consultório de Psicologia & Psiquiatria";
  const heroTitle = site?.heroTitle || "Cuidando da sua saúde mental com acolhimento e excelência";
  const heroSubtitle =
    site?.heroSubtitle ||
    "Agende sua consulta presencial ou online com praticidade, acolhimento ético e total sigilo.";
  const aboutText =
    site?.aboutText ||
    "Nosso consultório foi idealizado para proporcionar um espaço terapêutico seguro, empático e transformador.";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-[var(--primary)]">
            {site?.logoHorizontalUrl ? (
              <img src={site.logoHorizontalUrl} alt={clinicName} className="h-8 max-w-[200px] object-contain" />
            ) : site?.logoUrl ? (
              <img src={site.logoUrl} alt={clinicName} className="h-8 w-8 object-contain rounded-md" />
            ) : (
              <Stethoscope className="h-6 w-6" />
            )}
            <span className="text-lg tracking-tight">{clinicName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#sobre" className="hover:text-[var(--primary)] transition-colors">Sobre</a>
            <a href="#servicos" className="hover:text-[var(--primary)] transition-colors">Atendimentos</a>
            <a href="#localizacao" className="hover:text-[var(--primary)] transition-colors">Consultório</a>
            <a href="#contato" className="hover:text-[var(--primary)] transition-colors">Contato</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Área do Paciente
              </Button>
            </Link>
            <Link href="/agendar">
              <Button size="sm" className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Agendar Consulta</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden border-b border-slate-200/60 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5 bg-slate-50 border-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Atendimento Humanizado • Presencial & Teleconsulta</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {heroTitle}
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600">
            {heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/agendar">
              <Button size="lg" className="gap-2 text-sm shadow-sm">
                <span>Agendar Horário Online</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#servicos">
              <Button variant="outline" size="lg" className="text-sm">
                Conhecer Atendimentos
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* About Professional Section */}
      <section id="sobre" className="py-16 px-4 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-extrabold text-4xl shrink-0 shadow-sm border border-[var(--primary)]/20">
              <Heart className="h-16 w-16" />
            </div>

            <div className="space-y-3 text-center md:text-left">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-mono text-xs font-semibold">
                {profile?.crpCrm || "Registro Profissional"}
              </div>
              <h2 className="text-2xl font-bold">{profile?.fullName || "Profissional de Saúde"}</h2>
              <p className="text-sm font-medium text-[var(--primary)]">
                {profile?.title || "Psicólogo(a) Clínico(a)"}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {profile?.bio || aboutText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Serviços e Atendimentos</h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">
              Sessões com hora marcada, sigilo absoluto e protocolos respaldados pela prática clínica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base text-slate-900">{service.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {service.description || "Atendimento psicológico clínico personalizado."}
                    </CardDescription>
                  </div>
                  <span className="text-lg font-bold text-[var(--primary)] shrink-0">
                    {service.isFree ? "Gratuito" : formatBRL(service.priceCents)}
                  </span>
                </CardHeader>
                <CardContent className="pt-2 text-xs flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {service.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      {service.modality === "ONLINE" ? (
                        <>
                          <Video className="h-3.5 w-3.5" /> Teleconsulta
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5" /> Presencial
                        </>
                      )}
                    </span>
                  </div>
                  <Link href="/agendar">
                    <Button size="sm" className="h-8 text-xs gap-1">
                      <span>Agendar</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Location and Contact */}
      <section id="localizacao" className="py-16 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[var(--primary)]" />
              <span>Localização do Consultório</span>
            </h3>
            <p className="text-sm text-slate-600">
              {site?.address || "Av. Paulista, 1000, Bela Vista — São Paulo/SP"}
            </p>
            <p className="text-xs text-slate-500">
              Ambiente climatizado, acessível e preparado para garantir total conforto e privacidade.
            </p>
          </div>

          <div id="contato" className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-[var(--primary)]" />
              <span>Contatos e Informações</span>
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              {site?.phone && <div>Telefone: <strong>{site.phone}</strong></div>}
              {site?.email && <div>E-mail: <strong>{site.email}</strong></div>}
              {site?.instagram && <div>Instagram: <strong>{site.instagram}</strong></div>}
            </div>
          </div>
        </div>
      </section>

      {/* Custom HTML Isolado e Sanitizado (se configurado pelo profissional) */}
      {site?.customHtml && (
        <section className="py-8 px-4 max-w-4xl mx-auto text-xs text-slate-500">
          <div dangerouslySetInnerHTML={{ __html: site.customHtml }} />
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4 text-xs text-slate-500 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p>&copy; {new Date().getFullYear()} {clinicName}. Todos os direitos reservados.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Software de Gestão Clínica PSI — Instalação Autônoma Dedicada.
            </p>
          </div>

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
