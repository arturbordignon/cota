export const ptBRMessages = {
  "actions": {
    "createProposal": "Criar proposta",
    "addClient": "Adicionar cliente",
    "createTemplate": "Criar modelo",
    "viewDetails": "Ver detalhes",
    "buyCredits": "Comprar créditos",
    "upgradePlan": "Atualizar plano",
    "generateReport": "Gerar relatório",
    "markAll": "Marcar todas como lidas",
    "invite": "Convidar",
    "save": "Salvar"
  },
  "activity": {
    "title": "Registros de logs",
    "description": "Audite ações realizadas pelos membros e eventos automáticos gerados pela plataforma.",
    "restricted": {
      "title": "Registros de logs",
      "description": "Somente administradores podem visualizar o histórico de auditoria.",
      "callout": "Solicite acesso administrativo para acompanhar alterações críticas."
    },
    "filters": {
      "searchPlaceholder": "Buscar por pessoa, evento ou contexto",
      "allModules": "Todos os módulos",
      "clear": "Limpar filtros"
    },
    "states": {
      "empty": "Nenhum evento encontrado com os filtros atuais.",
      "error": "Não foi possível carregar o registro de atividades."
    },
    "categories": {
      "proposal": "Propostas",
      "department": "Departamentos",
      "notifications": "Notificações",
      "billing": "Cobrança",
      "user": "Usuários",
      "system": "Sistema"
    },
    "card": {
      "labels": {
        "responsible": "Responsável",
        "when": "Quando",
        "ip": "IP",
        "agent": "Agente",
        "technicalDetails": "Detalhes técnicos"
      }
    },
    "entries": {
      "proposalAccepted": "Proposta {proposal} aceita por {client}",
      "departmentUpdated": "Departamento {department} alterou permissões de {module}",
      "userInvited": "Convidou {invitee} para o departamento {department}",
      "planChanged": "Plano atualizado de {from} para {to}",
      "notificationsDispatch": "Resumo diário enviado para {recipients, plural, one {# membro} other {# membros}}"
    }
  },
  "clients": {
    "title": "Clientes",
    "description": "Centralize dados fiscais, limites de crédito e histórico para negociar com mais confiança.",
    "actions": {
      "add": "Adicionar cliente"
    },
    "warnings": {
      "tokenMissing": "Defina a variável NEXT_PUBLIC_API_TOKEN ou autentique-se para consultar os clientes reais."
    },
    "states": {
      "loading": "Carregando clientes...",
      "error": "Não foi possível carregar os clientes.",
      "empty": "Nenhum cliente cadastrado ainda. Utilize o botão acima para adicionar o primeiro contato."
    },
    "badges": {
      "memberSince": "Desde {date}"
    },
    "stats": {
      "total": "Total de clientes",
      "recent": "Adicionados nos últimos 30 dias",
      "recentHint": "Considera a data de criação",
      "withEmail": "Clientes com e-mail"
    },
    "quickActions": {
      "title": "Ações rápidas",
      "description": "Mantenha o relacionamento ativo com follow-ups imediatos.",
      "badge": "Engajamento",
      "newProposal": "Nova proposta",
      "registerClient": "Cadastrar cliente",
      "importCsv": "Importar CSV"
    },
    "topClients": {
      "title": "Clientes recentes",
      "badge": "Últimos 3",
      "noCompany": "Sem empresa",
      "joined": "Desde",
      "empty": "Assim que cadastrar clientes eles aparecerão aqui.",
      "viewAll": "Ver todos os clientes"
    },
    "filters": {
      "search": {
        "label": "Pesquisar",
        "placeholder": "Busque por nome, empresa, e-mail ou telefone"
      },
      "clearSearch": "Limpar",
      "show": "Mostrar filtros",
      "hide": "Ocultar filtros",
      "summaryFiltered": "Exibindo {count} de {total} clientes",
      "summaryAll": "Exibindo todos os {total} clientes",
      "clear": "Limpar filtros",
      "sort": {
        "label": "Ordenar",
        "recent": "Mais recentes",
        "oldest": "Mais antigos",
        "name": "Nome (A-Z)"
      },
      "contact": {
        "label": "Contato",
        "all": "Todos os contatos",
        "withEmail": "Com e-mail",
        "withPhone": "Com telefone"
      }
    },
    "table": {
      "headers": {
        "name": "Nome",
        "company": "Empresa",
        "email": "E-mail",
        "phone": "Telefone",
        "createdAt": "Criado em",
        "actions": "Ações"
      },
      "noCompany": "Sem empresa",
      "noEmail": "Sem e-mail",
      "noPhone": "Sem telefone",
      "view": "Ver detalhes",
      "actions": {
        "openMenu": "Abrir ações",
        "sendProposal": "Enviar proposta",
        "copyEmail": "Copiar e-mail",
        "copied": "Copiado",
        "noEmail": "E-mail não informado"
      }
    },
    "dialog": {
      "title": "Adicionar cliente",
      "description": "Informe os dados principais para cadastrar um novo contato.",
      "fields": {
        "name": "Nome completo",
        "company": "Razão social",
        "email": "E-mail corporativo",
        "phone": "Telefone",
        "notes": "Observações"
      },
      "errors": {
        "name": "Informe o nome do cliente",
        "email": "E-mail inválido"
      },
      "placeholders": {
        "name": "Ex.: Construtora Horizonte",
        "company": "Nome jurídico",
        "email": "contato@empresa.com",
        "phone": "+55 (11) 99999-0000",
        "notes": "Segmento, preferências, contatos extras"
      },
      "cancel": "Cancelar",
      "save": "Salvar cliente",
      "saving": "Salvando..."
    },
    "details": {
      "loading": "Carregando cliente...",
      "subtitle": "Dados do relacionamento",
      "close": "Fechar",
      "notFound": "Cliente não encontrado.",
      "fields": {
        "company": "Empresa",
        "email": "E-mail",
        "phone": "Telefone",
        "notes": "Observações",
        "createdAt": "Criado em",
        "updatedAt": "Atualizado em"
      },
      "placeholders": {
        "empty": "Não informado"
      }
    }
  },
  "common": {
    "appName": "Propostas para Guindastes",
    "dashboard": {
      "title": "Painel de Controle",
      "welcome": "Bem-vindo de volta, {name}!",
      "quickAccess": "Acesso Rápido",
      "credits": "Créditos"
    },
    "navigation": {
      "dashboard": "Painel",
      "templates": "Modelos",
      "proposals": "Propostas",
      "clients": "Clientes",
      "services": "Serviços",
      "team": "Equipe",
      "activity": "Registros de Logs",
      "account": "Minha Conta",
      "crm": "Pipeline",
      "reports": "Relatórios"
    },
    "actions": {
      "createProposal": "Criar Proposta",
      "addClient": "Adicionar Cliente",
      "createTemplate": "Criar Modelo"
    },
    "search": {
      "placeholderPrefix": "Busque por {scope}",
      "action": "Pesquisar",
      "quick": {
        "proposals": "Propostas",
        "clients": "Clientes",
        "templates": "Modelos"
      },
      "scopes": {
        "all": "Tudo",
        "proposals": "Propostas",
        "clients": "Clientes",
        "templates": "Modelos"
      },
      "recentLabel": "Buscas recentes",
      "recentSamples": [
        "Contrato manutenção",
        "Proposta 2418",
        "Cliente: Capixaba"
      ]
    },
    "topbar": {
      "openSearch": "Abrir busca",
      "closeSearch": "Fechar busca",
      "openNotifications": "Ver notificações",
      "openLocale": "Alterar idioma"
    },
    "notifications": {
      "title": "Notificações",
      "description": "Veja atualizações recentes de propostas, colaboradores e assinaturas.",
      "markAll": "Marcar todas como lidas",
      "tone": {
        "success": "Sucesso",
        "info": "Atualização",
        "warning": "Atenção"
      }
    },
    "permissionModules": {
      "dashboard": {
        "label": "Painel",
        "description": "Resumo geral de desempenho."
      },
      "proposals": {
        "label": "Propostas",
        "description": "Criação, edição e envio de propostas."
      },
      "templates": {
        "label": "Modelos",
        "description": "Biblioteca de modelos reutilizáveis."
      },
      "crm": {
        "label": "Pipeline",
        "description": "Kanban e acompanhamento comercial."
      },
      "reports": {
        "label": "Relatórios",
        "description": "Consultas dinâmicas e métricas."
      },
      "plan": {
        "label": "Planos",
        "description": "Gerenciamento de assinatura e limites."
      },
      "account": {
        "label": "Conta",
        "description": "Perfil do usuário e ajustes de assinatura."
      },
      "clients": {
        "label": "Clientes",
        "description": "Cadastro e detalhes dos clientes."
      },
      "services": {
        "label": "Serviços",
        "description": "Catálogo de serviços oferecidos."
      }
    },
    "permissions": {
      "actions": {
        "view": "Ver",
        "edit": "Editar"
      },
      "badges": {
        "view": {
          "enabled": "Ver",
          "disabled": "Restrito"
        },
        "edit": {
          "enabled": "Editar",
          "disabled": "Somente ver"
        }
      }
    },
    "loading": {
      "saving": "Salvando...",
      "searching": "Buscando...",
      "redirecting": "Redirecionando...",
      "opening": "Abrindo..."
    }
  },
  "dashboard": {
    "title": "Painel de Controle",
    "description": "Visão rápida dos créditos e atalhos principais para movimentar o funil de propostas.",
    "credits": {
      "label": "Créditos",
      "unlimited": "Ilimitado",
      "unavailable": "—"
    },
    "metrics": {
      "sent": {
        "label": "Propostas enviadas no mês",
        "delta": "{value} vs. mês anterior"
      },
      "conversion": {
        "label": "Taxa de aceite",
        "delta": "{value} vs. mês anterior"
      },
      "time": {
        "label": "Tempo médio de geração",
        "delta": "{value} vs. mês anterior",
        "unit": "min"
      },
      "noData": "Sem dados no período",
      "deltaUnavailable": "Sem comparação disponível"
    },
    "quickAccess": {
      "title": "Acesso rápido",
      "items": {
        "createProposal": {
          "description": "Monte uma proposta completa com anexos e totais.",
          "cta": "Ir agora"
        },
        "addClient": {
          "description": "Salve dados fiscais e contatos para preencher automaticamente.",
          "cta": "Ir agora"
        },
        "createTemplate": {
          "description": "Personalize modelos reutilizáveis com campos obrigatórios.",
          "cta": "Ir agora"
        }
      }
    },
    "ctaButtons": {
      "buyCredits": "Comprar créditos",
      "upgradePlan": "Atualizar plano"
    },
    "warnings": {
      "tokenMissing": "Defina a variável NEXT_PUBLIC_API_TOKEN ou autentique-se para carregar os dados reais."
    },
    "states": {
      "error": "Não foi possível carregar os dados do painel."
    }
  },
  "departments": {
    "title": "Departamentos",
    "description": "Defina funções e permissões por departamento para padronizar o acesso da equipe.",
    "infoCard": "Cada departamento concentra permissões herdadas pelos membros associados. Utilize presets para agilizar a configuração e ajuste módulos individualmente conforme necessário.",
    "actions": {
      "new": "Novo departamento"
    },
    "list": {
      "showDetails": "Ver detalhes",
      "hideDetails": "Ocultar detalhes",
      "delete": "Remover"
    },
    "states": {
      "loading": "Carregando departamentos...",
      "empty": "Nenhum departamento cadastrado ainda.",
      "loadError": "Não foi possível carregar os departamentos"
    },
    "restricted": {
      "title": "Departamentos",
      "description": "Somente administradores podem gerenciar departamentos e permissões.",
      "callout": "Solicite acesso administrativo para alterar as regras de permissão."
    },
    "fields": {
      "name": "Nome",
      "description": "Descrição",
      "preset": "Preset",
      "permissions": "Permissões"
    },
    "placeholders": {
      "name": "Ex.: Comercial",
      "description": "Resumo do propósito desse departamento"
    },
    "presets": {
      "applyLabel": "Aplicar preset:",
      "options": {
        "none": "Nenhum",
        "view": "Somente ver",
        "all": "Acesso total"
      },
      "badge": {
        "none": "Nenhum",
        "view": "Somente ver",
        "all": "Acesso total",
        "custom": "Personalizado"
      }
    },
    "dialog": {
      "title": "Novo departamento",
      "description": "Defina um nome e escolha um preset para agilizar a configuração das permissões.",
      "close": "Fechar",
      "errors": {
        "nameRequired": "Informe um nome para o departamento."
      },
      "actions": {
        "cancel": "Cancelar",
        "submit": "Salvar departamento",
        "saving": "Salvando..."
      }
    },
    "deleteDialog": {
      "title": "Remover departamento",
      "description": "Tem certeza que deseja remover o departamento {name}? Os membros vinculados ficarão sem departamento.",
      "cancel": "Cancelar",
      "confirm": "Remover",
      "deleting": "Removendo..."
    },
    "errors": {
      "saveFailed": "Não foi possível salvar o departamento.",
      "createFailed": "Não foi possível criar o departamento.",
      "deleteFailed": "Erro ao excluir departamento."
    }
  },
  "navigation": {
    "dashboard": "Painel",
    "templates": "Modelos",
    "proposals": "Propostas",
    "clients": "Clientes",
    "services": "Serviços",
    "team": "Equipe",
    "activity": "Registros de Logs",
    "crm": "Pipeline",
    "reports": "Relatórios",
    "account": "Minha Conta"
  },
  "notifications": {
    "title": "Notificações",
    "description": "Acompanhe atualizações recentes em propostas, equipe e cobrança.",
    "markAll": "Marcar todas como lidas",
    "tone": {
      "success": "Sucesso",
      "info": "Atualização",
      "warning": "Atenção"
    },
    "items": [
      {
        "id": "proposalAccepted",
        "title": "Proposta aceita",
        "description": "A Atlas Engenharia aprovou a proposta #2418.",
        "timestamp": "Há 2 horas",
        "tone": "success"
      },
      {
        "id": "commentAdded",
        "title": "Comentário adicionado",
        "description": "João Lima comentou na proposta #2397 solicitando ajuste de valores.",
        "timestamp": "Ontem",
        "tone": "info"
      },
      {
        "id": "paymentPending",
        "title": "Pagamento pendente",
        "description": "A assinatura do workspace Operações expira em 3 dias.",
        "timestamp": "Há 3 dias",
        "tone": "warning"
      }
    ]
  },
  "reports": {
    "page": {
      "alerts": {
        "missingToken": "Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para consultar seus dados reais.",
        "loadError": "Não foi possível carregar os indicadores: {error}"
      },
    "header": {
      "title": "Relatórios dinâmicos",
      "description": "Peça insights com linguagem natural. Geramos a consulta SQL e apresentamos os dados como tabela ou gráfico."
    },
    "stats": {
      "totalProposals": "Total de propostas",
      "totalHint": "Inclui todos os status no período selecionado",
      "accepted": "Conversão no período",
      "acceptedHint": "Aceitas ÷ Total",
      "pipeline": "Valor em pipeline",
      "pipelineHint": "Ticket médio {avg}"
    },
    "quickActions": {
      "title": "Ações rápidas",
      "description": "Acelere as decisões sem sair do painel.",
      "badge": "Produtividade",
      "generate": "Abrir gerador personalizado",
      "useSuggestion": "Aplicar sugestão",
      "refresh": "Atualizar visão"
    },
    "highlights": {
      "title": "Destaques",
      "badge": "Neste período",
      "topPerformer": "Melhor desempenho",
      "totalSent": "{value} propostas enviadas",
      "unknown": "Indefinido",
      "noPerformer": "Exibiremos os destaques assim que houver propostas no período.",
      "upcoming": "Propostas mais recentes",
      "noClient": "Cliente não atribuído",
      "noUpcoming": "Nenhuma proposta foi criada no período selecionado."
    },
    "tabs": {
      "overview": "Visão geral",
      "custom": "Gerador personalizado"
    },
      "overview": {
        "loading": "Carregando indicadores...",
        "empty": "Nenhum dado disponível ainda.",
        "filters": {
          "label": "Intervalo (visão geral)",
          "hint": "Sem seleção = últimos 30 dias.",
          "periodBadge": "Período: {start} — {end}",
          "apply": "Aplicar"
        },
        "kpis": {
          "revenue": {
            "label": "Receita (aceitas)",
            "hint": "Soma das propostas aceitas"
          },
          "conversion": {
            "label": "Taxa de conversão",
            "hint": "Aceitas ÷ Total"
          },
          "ticket": {
            "label": "Ticket médio (aceitas)"
          },
          "aging": {
            "label": "Propostas abertas 14d+",
            "hint": "Atenção: priorizar follow-up"
          }
        },
        "status": {
          "title": "Propostas por status",
          "badge": "{count} no período",
          "empty": "Sem propostas registradas neste período.",
          "labels": {
            "DRAFT": "Rascunho",
            "PENDING": "Pendente",
            "SENT": "Enviada",
            "ACCEPTED": "Aceita",
            "DECLINED": "Recusada",
            "EXPIRED": "Expirada",
            "default": "Outros"
          }
        },
        "topClients": {
          "title": "Receita por cliente",
          "badge": "Top 5",
          "total": "Total {value}",
          "empty": "Nenhum cliente com propostas aceitas ainda."
        },
        "team": {
          "title": "Propostas por consultor",
          "badge": "Total vs Aceitas",
          "empty": "Nenhuma proposta atribuída a membros."
        },
        "cityRevenue": {
          "title": "Receita por cidade",
          "badge": "Top 8"
        },
        "pipelineSummary": {
          "title": "Resumo do pipeline",
          "badge": "{leads} leads • {value}",
          "columns": {
            "stage": "Etapa",
            "leads": "Leads",
            "value": "Valor estimado"
          },
          "empty": "Cadastre etapas e leads no pipeline para acompanhar aqui."
        },
        "pipelineDistribution": {
          "title": "Distribuição do pipeline",
          "badge": "Leads por etapa",
          "formatLead": "{value} leads",
          "empty": "Nenhum lead nas etapas do pipeline."
        },
        "recentProposals": {
          "title": "Propostas recentes",
          "badge": "{start} — {end}",
          "columns": {
            "title": "Título",
            "client": "Cliente",
            "status": "Status",
            "createdAt": "Criada em"
          },
          "fallbacks": {
            "title": "Sem título",
            "client": "Sem cliente",
            "empty": "Nenhuma proposta criada no período analisado."
          },
          "noDate": "—"
        }
      }
    },
    "tabs": {
      "performance": {
        "label": "Performance comercial",
        "cards": {
          "conversion": {
            "title": "Taxa de conversão",
            "description": "Percentual de propostas aceitas em relação às enviadas.",
            "period": "Últimos 8 meses",
            "changeLabel": "+5,4% vs. período anterior",
            "metrics": {
              "average": "Taxa média",
              "sent": "Propostas enviadas",
              "accepted": "Aceites",
              "target": "Meta"
            }
          },
          "cycle": {
            "title": "Ciclo médio",
            "description": "Dias entre a criação e o aceite das propostas.",
            "period": "Último semestre",
            "metrics": {
              "current": "Ciclo atual",
              "target": "Ciclo alvo",
              "best": "Melhor mês"
            }
          }
        },
        "detail": {
          "title": "Painel por consultor",
          "description": "Produtividade, conversão e ciclo médio por membro da equipe.",
          "columns": {
            "consultant": "Consultor",
            "proposals": "Propostas",
            "accepted": "Aceites",
            "conversion": "Conversão",
            "cycle": "Ciclo médio"
          }
        }
      },
      "revenue": {
        "label": "Receita e clientes",
        "cards": {
          "topClients": {
            "title": "Receita por cliente",
            "description": "Principais clientes pelo valor contratado nos últimos 90 dias.",
            "period": "90 dias",
            "metrics": {
              "avgTicket": "Ticket médio",
              "activeClients": "Clientes ativos"
            }
          },
          "segments": {
            "title": "Receita por segmento",
            "description": "Resumo de propostas e faturamento por segmento.",
            "period": "Últimos 60 dias",
            "metrics": {
              "segments": "Segmentos",
              "total": "Receita total"
            }
          }
        },
        "detail": {
          "title": "KPIs por segmento",
          "description": "Clientes ativos, ticket médio e crescimento em relação ao período anterior.",
          "columns": {
            "segment": "Segmento",
            "clients": "Clientes",
            "avgTicket": "Ticket médio",
            "growth": "Crescimento"
          }
        }
      },
      "operations": {
        "label": "Pipeline e operações",
        "cards": {
          "pipeline": {
            "title": "Pipeline operacional",
            "description": "Quantidade de propostas por etapa do processo comercial.",
            "period": "Mensal",
            "metrics": {
              "total": "Total negociado",
              "closed": "Fechadas",
              "conversion": "Conversão do funil"
            }
          },
          "team": {
            "title": "Performance por consultor",
            "description": "Propostas enviadas, aceites e ticket médio por membro da equipe.",
            "period": "Últimos 30 dias",
            "metrics": {
              "activeTeam": "Equipe ativa"
            }
          }
        },
        "detail": {
          "title": "Tempo por etapa",
          "description": "Tempo médio e percentual de queda em cada fase do funil.",
          "columns": {
            "stage": "Etapa",
            "duration": "Tempo médio",
            "dropoff": "Queda"
          },
          "notApplicable": "—"
        }
      },
      "custom": {
        "label": "Gerador personalizado",
        "form": {
          "intent": {
            "label": "O que você deseja analisar?",
            "placeholder": "Ex.: Quantas propostas foram aceitas em fevereiro?"
          },
          "visualization": "Visualização desejada",
          "dateRange": "Intervalo (datas)",
          "suggestions": "Sugestões rápidas",
          "helper": "Tradução natural → SQL será exibida para confirmação antes da consulta.",
          "clear": "Limpar",
          "generate": "Gerar relatório",
          "generating": "Gerando...",
          "visualizationOptions": {
            "table": "Tabela",
            "bar": "Gráfico de barras",
            "line": "Gráfico de linhas"
          },
          "suggestionValues": {
            "revenue90": "Receita por cliente nos últimos 90 dias",
            "conversionConsultant": "Taxa de conversão mensal por consultor",
            "cycle": "Tempo médio entre proposta e faturamento",
            "segment": "Propostas enviadas por segmento"
          },
          "errors": {
            "intent": "Descreva o que deseja analisar.",
            "auth": "Autentique-se para gerar relatórios.",
            "unexpected": "Erro inesperado ao gerar relatório."
          }
        },
        "sqlCard": {
          "title": "Consulta SQL",
          "placeholder": "A consulta gerada aparecerá aqui após solicitar um relatório."
        },
        "resultCard": {
          "title": "Resultados",
          "placeholder": "Solicite um relatório acima e exibiremos os dados aqui.",
          "rawTitle": "Retorno bruto",
          "waitingTitle": "Aguardando geração"
        }
      }
    },
    "states": {
      "error": "Não foi possível carregar o relatório."
    }
  },
  "templates": {
    "dialog": {
      "title": "Criar modelo",
      "description": "Defina um layout que possa ser reutilizado nas propostas da equipe.",
      "close": "Fechar",
      "fields": {
        "name": "Nome do modelo",
        "description": "Descrição",
        "category": "Categoria",
        "locale": "Idioma",
        "html": "HTML do modelo",
        "htmlHint": "Use HTML básico. Você pode ajustar estilos depois."
      },
      "placeholders": {
        "name": "Ex.: Proposta padrão de locação",
        "description": "Resumo exibido na listagem",
        "category": "Ex.: Operações"
      },
      "localeLabels": {
        "ptBR": "Português",
        "en": "Inglês"
      },
      "actions": {
        "cancel": "Cancelar",
        "submit": "Criar modelo",
        "saving": "Criando..."
      },
      "defaultHtml": `<section style="font-family: Inter, Arial, sans-serif; padding: 24px;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Proposta Comercial</h1>
  <p style="margin-bottom: 12px;">Use este espaço para apresentar sua empresa, serviços e condições comerciais.</p>
  <ul>
    <li>Escopo resumido</li>
    <li>Investimento estimado</li>
    <li>Prazo de execução</li>
  </ul>
</section>`
    },
    "page": {
      "alerts": {
        "missingToken": "Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para carregar os modelos reais.",
        "loadError": "Não foi possível carregar os modelos: {message}"
      },
      "header": {
        "title": "Modelos de propostas",
        "description": "Ganhe velocidade com modelos sugeridos ou personalize layouts para o seu negócio."
      },
      "actions": {
        "openBuilder": "Editor visual",
        "new": "Criar modelo"
      },
      "tabs": {
        "catalog": {
          "label": "Modelos padrão",
          "description": "Biblioteca curada para serviços pesados"
        },
        "mine": {
          "label": "Meus modelos",
          "description": "Favoritos e templates da sua equipe"
        },
        "upload": {
          "label": "Carregar modelo",
          "description": "Importe PDF ou DOCX e mapeie campos"
        }
      },
      "filters": {
        "category": {
          "all": "Todos os segmentos"
        }
      },
      "upload": {
        "description": "Arraste e solte arquivos PDF ou DOCX para transformá-los em modelos preenchíveis. Você poderá mapear campos depois do upload.",
        "button": "Carregar arquivo"
      },
      "cards": {
        "noDescription": "Sem descrição disponível.",
        "use": "Usar modelo"
      },
      "empty": {
        "title": "Nenhum modelo encontrado para este filtro",
        "description": "Crie um layout do zero ou faça upload de um arquivo existente para começar.",
        "action": "Criar modelo personalizado"
      }
    }
  },
  "proposals": {
    "status": {
      "DRAFT": "Rascunho",
      "PENDING": "Pendente",
      "SENT": "Enviada",
      "ACCEPTED": "Aceita",
      "DECLINED": "Recusada",
      "EXPIRED": "Expirada"
    },
    "page": {
      "alerts": {
        "missingToken": "Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar as propostas reais.",
        "loadError": "Não foi possível carregar as propostas: {message}"
      },
      "header": {
        "title": "Minhas propostas",
        "description": "Acompanhe status, gere PDFs e compartilhe links rápidos com seus clientes."
      },
      "actions": {
        "create": "Criar proposta"
      },
      "table": {
        "headers": {
          "client": "Cliente",
          "title": "Título",
          "createdAt": "Data de criação",
          "status": "Status",
          "actions": "Ações"
        },
        "loading": "Carregando propostas...",
        "empty": "Nenhuma proposta encontrada. Utilize o botão acima para criar a primeira.",
        "noClient": "Sem cliente associado",
        "noTitle": "—",
        "view": "Ver proposta",
        "copyLink": "Copiar link"
      }
    }
  },
  "crm": {
    "page": {
      "alerts": {
        "missingToken": "Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar o pipeline real.",
        "loadError": "Não foi possível carregar o pipeline: {message}"
      },
      "header": {
        "title": "Pipeline de vendas",
        "description": "Organize oportunidades em etapas, mova cards entre colunas e acompanhe o potencial de receita por fase."
      },
      "actions": {
        "newLead": "Novo lead",
        "customizeStages": "Personalizar etapas"
      },
      "summary": {
        "leads": "Oportunidades",
        "value": "Valor potencial"
      },
      "overview": {
        "viewOnly": "Você possui acesso de visualização. Solicite permissões de edição para movimentar etapas ou criar novos leads.",
        "dragHint": "Arraste e solte cards para movimentar leads entre etapas. Etapas personalizadas serão salvas por workspace em uma próxima atualização."
      },
      "stageColors": {
        "info": "Informativo",
        "warning": "Atenção",
        "success": "Ganho",
        "neutral": "Pendente"
      },
      "errors": {
        "updateStage": "Não foi possível atualizar a etapa.",
        "reorderStages": "Não foi possível reordenar as etapas.",
        "deleteStage": "Não foi possível remover a etapa. Verifique se não há leads associados.",
        "createStage": "Não foi possível criar a etapa.",
        "deleteStageBlocked": "Remova ou mova os leads desta etapa antes de excluí-la.",
        "invalidStageName": "Informe um nome válido para a nova etapa."
      },
      "forms": {
        "notesPlaceholder": "Resumo do projeto, próximas ações..."
      }
    }
  },
  "account": {
    "page": {
      "loading": "Carregando dados da conta...",
      "signInPrompt": "Faça login novamente para visualizar as informações da conta.",
      "header": {
        "title": "Minha conta",
        "description": "Veja o status atual da assinatura e faça upgrade quando precisar."
      },
      "actions": {
        "signOut": "Encerrar sessão"
      },
      "upsell": {
        "title": "Precisa de mais propostas?",
        "description": "Faça upgrade do seu plano a qualquer momento e libere limites maiores para a sua equipe.",
        "cta": "Upgrade de plano"
      }
    }
  },
  "team": {
    "title": "Equipe",
    "description": "Defina o departamento de cada colaborador para aplicar permissões padronizadas.",
    "infoCard": "As permissões são herdadas do departamento selecionado. Ajuste regras específicas em Gerenciar departamentos.",
    "actions": {
      "manageDepartments": "Gerenciar departamentos",
      "addMember": "Adicionar membro"
    },
    "alerts": {
      "missingToken": "Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar a equipe real.",
      "loadError": "Não foi possível carregar a equipe: {message}"
    },
    "memberCard": {
      "badge": {
        "noDepartment": "Sem departamento"
      },
      "fields": {
        "department": "Departamento"
      },
      "sections": {
        "permissions": "Permissões herdadas"
      },
      "buttons": {
        "revert": "Reverter",
        "save": "Salvar alterações",
        "saving": "Salvando..."
      }
    },
    "restricted": {
      "title": "Equipe",
      "description": "Sua conta não possui acesso administrativo para gerenciar permissões.",
      "callout": "Entre em contato com um administrador para solicitar alterações de departamento ou atualização de acessos."
    },
    "dialog": {
      "title": "Adicionar membro",
      "description": "Selecione o departamento correto para aplicar as permissões automaticamente.",
      "close": "Fechar",
      "fields": {
        "name": "Nome completo",
        "email": "E-mail corporativo",
        "role": "Cargo",
        "department": "Departamento"
      },
      "placeholders": {
        "name": "Ex.: Fernanda Matos",
        "email": "nome@suaempresa.com",
        "role": "Ex.: Analista Comercial",
        "optional": "opcional"
      },
      "actions": {
        "cancel": "Cancelar",
        "submit": "Convidar membro",
        "saving": "Enviando convite..."
      }
    },
    "invite": {
      "successTitle": "Convite gerado com sucesso",
      "successDescription": "Compartilhe o link abaixo com o novo membro para que ele finalize o cadastro.",
      "copy": "Copiar link",
      "copied": "Link copiado!",
      "copyExisting": "Copiar convite",
      "copyingExisting": "Copiando...",
      "copiedExisting": "Convite copiado!",
      "resend": "Reenviar e-mail",
      "resending": "Enviando...",
      "resent": "Convite reenviado!",
      "pendingNote": "Convite pendente. Compartilhe o link ou reenvie por e-mail.",
      "linkLabel": "Link atual do convite",
      "generateLink": "Gerar link",
      "generating": "Gerando...",
      "delete": "Excluir convite",
      "deleting": "Excluindo...",
      "deleteConfirm": "Remover este convite pendente? O colaborador só poderá acessar se você convidá-lo novamente.",
      "deleteTitle": "Excluir convite",
      "deleteConfirmButton": "Sim, excluir",
      "deleteError": "Não foi possível remover o convite. Tente novamente.",
      "emailSent": "E-mail de convite enviado.",
      "emailNotSent": "Não foi possível enviar o e-mail automaticamente. Compartilhe o link manualmente."
    },
    "defaults": {
      "role": "Colaborador"
    },
    "roles": {
      "owner": "Proprietário",
      "admin": "Administrador",
      "manager": "Gestor",
      "viewer": "Visualizador",
      "member": "Colaborador"
    },
    "states": {
      "empty": "Nenhum membro cadastrado ainda. Utilize o botão acima para enviar o primeiro convite."
    },
    "ranking": {
      "title": "Ranking comercial",
      "description": "Veja quem fechou mais propostas no período selecionado.",
      "period": {
        "month": "Último mês",
        "quarter": "Últimos 3 meses",
        "year": "Último ano"
      },
      "metrics": {
        "accepted": "{count, plural, one {# proposta aceita} other {# propostas aceitas}}"
      },
      "empty": "Ainda não há dados suficientes para montar o ranking nesse período.",
      "error": "Não foi possível carregar o ranking: {message}"
    }
  }
} as const;
