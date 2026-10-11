import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";

export default function NewClientPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Cadastrar cliente"
        description="Armazene dados completos para preencher propostas em segundos e manter o histórico sempre atualizado."
      />
      <Card className="max-w-3xl space-y-6 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome/Razão social" htmlFor="client-name">
            <Input id="client-name" placeholder="Empresa Exemplo LTDA" />
          </Field>
          <Field label="CNPJ/CPF" htmlFor="cnpj">
            <Input id="cnpj" placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" placeholder="contato@empresa.com" />
          </Field>
          <Field label="Telefone" htmlFor="phone">
            <Input id="phone" placeholder="(11) 91234-5678" />
          </Field>
          <Field label="Segmento" htmlFor="segment">
            <Select id="segment" defaultValue="construcao">
              <SelectItem value="construcao">Construção</SelectItem>
              <SelectItem value="logistica">Logística</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </Select>
          </Field>
          <Field label="Limite de crédito interno" htmlFor="credit">
            <Select id="credit" defaultValue="padrao">
              <SelectItem value="padrao">Padrão (R$ 50.000)</SelectItem>
              <SelectItem value="alto">Alto (R$ 150.000)</SelectItem>
              <SelectItem value="sob-demanda">Sob demanda</SelectItem>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button>Salvar cliente</Button>
        </div>
      </Card>
    </section>
  );
}
