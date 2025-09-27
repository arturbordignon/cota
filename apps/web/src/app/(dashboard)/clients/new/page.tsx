import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

export default function NewClientPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Cadastrar cliente"
        description="Armazene dados completos para preencher propostas em segundos e manter o histórico sempre atualizado."
      />
      <Card className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome/Razão social</Label>
            <Input id="client-name" placeholder="Empresa Exemplo LTDA" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ/CPF</Label>
            <Input id="cnpj" placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="contato@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" placeholder="(11) 91234-5678" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="segment">Segmento</Label>
            <Select defaultValue="construcao">
              <SelectItem value="construcao">Construção</SelectItem>
              <SelectItem value="logistica">Logística</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit">Limite de crédito interno</Label>
            <Select defaultValue="padrao">
              <SelectItem value="padrao">Padrão (R$ 50.000)</SelectItem>
              <SelectItem value="alto">Alto (R$ 150.000)</SelectItem>
              <SelectItem value="sob-demanda">Sob demanda</SelectItem>
            </Select>
          </div>
        </div>

        <Button className="w-full sm:w-auto">Salvar cliente</Button>
      </Card>
    </section>
  );
}
