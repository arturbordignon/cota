import { Card } from "@/components/ui/card";

export default function NewTemplatePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Criar Novo Modelo</h1>
        <p className="text-muted">
          Defina os campos obrigatórios, placeholders e estrutura da sua proposta padrão.
        </p>
      </div>
      <Card className="rounded-2xl border-dashed border-outline bg-background/70 px-8 py-12 text-muted">
        Editor visual de modelos (drag-and-drop) será implementado aqui.
      </Card>
    </section>
  );
}
