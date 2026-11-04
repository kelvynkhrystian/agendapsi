import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center">
      <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Página não encontrada</h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 mb-8">
        O endereço que você tentou acessar não existe, foi movido ou está temporariamente indisponível.
      </p>

      <div className="flex gap-4">
        <Link href="/">
          <Button variant="primary" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Página Inicial</span>
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Acessar Conta</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
