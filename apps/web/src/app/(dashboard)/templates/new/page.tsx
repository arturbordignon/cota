import { PaintBrush } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NewTemplatePage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Criar novo modelo"
        description="Defina os campos obrigatórios, placeholders e estrutura da sua proposta padrão."
      />
      <EmptyState
        icon={<PaintBrush size={24} weight="bold" />}
        title="Editor de campos em construção"
        description="Enquanto isso, monte o layout do modelo no editor visual."
        action={
          <Button asChild>
            <Link href="/templates/builder">Abrir editor visual</Link>
          </Button>
        }
      />
    </section>
  );
}
