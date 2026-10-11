import fp from 'fastify-plugin';
import type { Prisma } from '@crane/db';

const CRANE_TEMPLATE_ID = 'a3a92568-5d5f-4de8-9f7c-6f9b4a0e9d3f';

const craneTemplate = {
  id: CRANE_TEMPLATE_ID,
  name: 'Modelo - Proposta de Serviço de Guindaste',
  description: 'Layout base para propostas de içamento com guindaste, cobrindo escopo, equipe e investimentos.',
  locale: 'pt-BR',
  category: 'Serviços',
  inputSchemaJson: {
    version: 1,
    sections: [
      {
        title: 'Dados do Projeto',
        fields: [
          { name: 'job.projectName', label: 'Nome do projeto', type: 'text' },
          { name: 'job.siteLocation', label: 'Local da operação', type: 'text' },
          { name: 'job.schedule', label: 'Janela de operação', type: 'text' },
        ],
      },
      {
        title: 'Escopo e Recursos',
        fields: [
          { name: 'job.scope', label: 'Escopo resumido', type: 'list' },
          { name: 'equipment', label: 'Equipamentos', type: 'collection' },
          { name: 'team', label: 'Equipe e certificações', type: 'collection' },
        ],
      },
      {
        title: 'Investimentos',
        fields: [
          { name: 'pricing.mobilization', label: 'Mobilização / Desmobilização', type: 'currency' },
          { name: 'pricing.dailyRate', label: 'Diária operacional', type: 'currency' },
          { name: 'pricing.total', label: 'Investimento estimado', type: 'currency' },
        ],
      },
    ],
  } satisfies Prisma.InputJsonValue,
  defaultDataJson: {
    company: {
      name: 'CranePro Serviços Pesados',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 4002-8922',
      email: 'contato@cranepro.com.br',
      tagline: 'Içamentos industriais com segurança, experiência e precisão.',
    },
    job: {
      projectName: 'Montagem de Estrutura Metálica - Galpão Logístico',
      siteLocation: 'Porto de Santos, SP',
      schedule: 'Previsão: 22 a 26 de julho de 2024 (5 dias de operação)',
      scope: [
        'Içamento e posicionamento de treliças metálicas de até 48 metros.',
        'Suporte ao alinhamento e travamento das estruturas secundárias.',
        'Disponibilização de supervisor técnico durante todo o turno.',
      ],
    },
    equipment: [
      {
        name: 'Guindaste todo-terreno Liebherr LTM 1100-5.2',
        capacity: 'Capacidade nominal 100t',
        reach: 'Lança principal 52m + jib 19m',
        notes: 'Equipamento com certificado de inspeção atualizado (NR-12 / NR-18).',
      },
      {
        name: 'Caminhão Munck 30t',
        capacity: 'Apoio logístico e movimentação de acessórios',
        notes: 'Inclui cesto aéreo e ferramental complementar.',
      },
    ],
    team: [
      'Operador de guindaste certificado (SENAI / IPAF).',
      'Rigger responsável com ART e plano de rigging aprovado.',
      'Sinaleiro e equipe de amarração (2 profissionais).',
      'Técnico de segurança acompanhando a operação.',
    ],
    pricing: {
      mobilization: 'R$ 12.800,00',
      dailyRate: 'R$ 18.750,00',
      total: 'R$ 106.550,00',
      validity: 'Valores válidos por 15 dias corridos.',
    },
    terms: [
      'Operação sujeita a condições climáticas favoráveis e análise final do plano de rigging.',
      'Cliente responsável por fornecer base nivelada e acesso liberado para equipamentos pesados.',
      'Incluso seguro RC operacional e cobertura para equipamentos durante o período contratado.',
      'Pagamento: 40% na confirmação + 60% até 5 dias após a conclusão.',
    ],
  } satisfies Prisma.InputJsonValue,
  pdfLayoutOptionsJson: {
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
    showPageNumbers: true,
    accentColor: '#F5C300',
  } satisfies Prisma.InputJsonValue,
  htmlBody: `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Proposta de Serviço de Guindaste</title>
    <style>
      body { font-family: "Inter", Arial, sans-serif; color: #2a1e12; margin: 0; padding: 0; background: #f8f5ef; }
      .wrapper { max-width: 900px; margin: 0 auto; padding: 48px 40px; background: #ffffff; }
      h1, h2, h3 { margin: 0; font-weight: 700; color: #1f150d; }
      h1 { font-size: 28px; margin-bottom: 12px; }
      h2 { font-size: 20px; margin: 32px 0 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #d29b0b; }
      h3 { font-size: 16px; margin: 24px 0 12px; }
      p, li { font-size: 14px; line-height: 1.6; }
      .header, .footer { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
      .badge { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; background: #fff7d1; color: #8a5c12; padding: 6px 12px; border-radius: 999px; letter-spacing: 0.06em; text-transform: uppercase; }
      .panel { background: #fbf7ef; border: 1px solid #f0e4cf; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; }
      .grid-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #f0e4cf; margin-top: 16px; }
      th, td { border: 1px solid #f0e4cf; padding: 12px 14px; text-align: left; }
      th { background: #fff4cc; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
      ul { padding-left: 20px; margin: 12px 0; }
      .highlight { font-size: 28px; font-weight: 700; color: #c0860a; }
      .muted { color: #6f6052; font-size: 13px; }
      .terms p { margin-bottom: 10px; }
      .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .photos img { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid #f0e4cf; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <header class="header">
        <div>
          <span class="badge">Proposta técnica & comercial</span>
          <h1>{{company.name}}</h1>
          <p class="muted">{{company.tagline}}</p>
        </div>
        <div class="panel" style="max-width: 260px;">
          <p style="font-weight: 600; margin-bottom: 6px;">Destinatário</p>
          <p style="margin: 0;">{{#client}}
            <strong>{{name}}</strong><br />
            {{companyName}}<br />
            {{email}}<br />
            {{phone}}
          {{/client}}</p>
        </div>
      </header>

      <section>
        <h2>Visão geral da operação</h2>
        <div class="grid-two">
          <div class="panel">
            <p class="muted">Projeto</p>
            <p><strong>{{job.projectName}}</strong></p>
            <p class="muted">Local</p>
            <p>{{job.siteLocation}}</p>
          </div>
          <div class="panel">
            <p class="muted">Período estimado</p>
            <p>{{job.schedule}}</p>
            <p class="muted">Contato</p>
            <p>{{company.email}} • {{company.phone}}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Escopo proposto</h2>
        <p>Baseado nas informações compartilhadas, estruturamos a operação com foco em segurança, produtividade e conformidade com normas vigentes.</p>
        <ul>
          {{#job.scope}}
          <li>{{.}}</li>
          {{/job.scope}}
        </ul>
      </section>

      <section>
        <h2>Recursos técnicos</h2>
        <h3>Equipamentos principais</h3>
        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Capacidade</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {{#equipment}}
            <tr>
              <td>{{name}}</td>
              <td>{{capacity}}</td>
              <td>{{reach}}{{#notes}}<br />{{notes}}{{/notes}}</td>
            </tr>
            {{/equipment}}
          </tbody>
        </table>

        <h3>Equipe envolvida</h3>
        <ul>
          {{#team}}
          <li>{{.}}</li>
          {{/team}}
        </ul>
      </section>

      <section>
        <h2>Investimento proposto</h2>
        <div class="panel">
          <div class="grid-two">
            <div>
              <p class="muted">Mobilização e desmobilização</p>
              <p><strong>{{pricing.mobilization}}</strong></p>
            </div>
            <div>
              <p class="muted">Diária operacional</p>
              <p><strong>{{pricing.dailyRate}}</strong></p>
              {{#pricing.days}}<p class="muted">{{pricing.days}} dia(s) de operação</p>{{/pricing.days}}
            </div>
          </div>
          <p class="muted" style="margin-top: 20px;">Investimento total estimado</p>
          <p class="highlight">{{pricing.total}}</p>
          <p class="muted">{{pricing.validity}}</p>
        </div>
      </section>

      {{#hasPhotos}}
      <section>
        <h2>Registro fotográfico</h2>
        <div class="photos">
          {{#photos}}
          <img src="{{url}}" alt="Foto da operação" />
          {{/photos}}
        </div>
      </section>
      {{/hasPhotos}}

      <section class="terms">
        <h2>Condições gerais</h2>
        {{#terms}}
        <p>• {{.}}</p>
        {{/terms}}
      </section>

      <footer class="footer" style="margin-top: 48px;">
        <div>
          {{#company.cnpj}}<p class="muted">CNPJ {{company.cnpj}}</p>{{/company.cnpj}}
          {{#company.address}}<p class="muted">{{company.address}}</p>{{/company.address}}
        </div>
        <div>
          <p class="muted">Documento gerado por Crane Proposals</p>
        </div>
      </footer>
    </div>
  </body>
</html>`,
};

export default fp(async (app) => {
  await app.prisma.proposalTemplate.upsert({
    where: { id: craneTemplate.id },
    create: {
      id: craneTemplate.id,
      accountId: null,
      name: craneTemplate.name,
      description: craneTemplate.description,
      locale: craneTemplate.locale,
      category: craneTemplate.category,
      inputSchemaJson: craneTemplate.inputSchemaJson,
      defaultDataJson: craneTemplate.defaultDataJson,
      pdfLayoutOptionsJson: craneTemplate.pdfLayoutOptionsJson,
      htmlBody: craneTemplate.htmlBody,
      isActive: true,
    },
    update: {
      name: craneTemplate.name,
      description: craneTemplate.description,
      locale: craneTemplate.locale,
      category: craneTemplate.category,
      inputSchemaJson: craneTemplate.inputSchemaJson,
      defaultDataJson: craneTemplate.defaultDataJson,
      pdfLayoutOptionsJson: craneTemplate.pdfLayoutOptionsJson,
      htmlBody: craneTemplate.htmlBody,
      isActive: true,
      accountId: null,
    },
  });
});
