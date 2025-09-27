import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-ink">Criar conta</h1>
        <p className="text-sm text-muted">
          Monte seu ambiente, defina idioma padrão e convide a equipe para colaborar nas propostas.
        </p>
      </div>

      <form className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="company">Nome da empresa</Label>
          <Input id="company" placeholder="ServicePro" autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">E-mail profissional</Label>
          <Input id="signup-email" type="email" placeholder="contato@empresa.com.br" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Senha</Label>
          <Input id="signup-password" type="password" placeholder="••••••••" autoComplete="new-password" />
          <p className="text-xs text-muted">Use pelo menos 8 caracteres, incluindo letras e números.</p>
        </div>
        <Button type="submit" className="w-full">
          Criar conta gratuita
        </Button>
      </form>

      <div className="text-center text-sm text-muted">
        Já possui uma conta?{' '}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
