import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-ink">Bem-vindo de volta</h1>
        <p className="text-sm text-muted">
          Acesse sua conta para continuar gerando propostas e acompanhando clientes.
        </p>
      </div>

      <form className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail corporativo</Label>
          <Input id="email" type="email" placeholder="nome@empresa.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      <div className="text-center text-sm text-muted">
        Não possui conta?{' '}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Criar conta agora
        </Link>
      </div>
    </div>
  );
}
