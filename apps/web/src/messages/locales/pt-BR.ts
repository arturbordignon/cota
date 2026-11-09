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
      },
      "actors": {
        "client": "Cliente (link da proposta)",
        "system": "Sistema"
      }
    },
    "entries": {
      "login": "{email} entrou na conta",
      "accountCreated": "Conta {account} criada",
      "departmentCreated": "Departamento {department} criado",
      "departmentUpdated": "Departamento {department} atualizado",
      "departmentDeleted": "Departamento {department} removido",
      "userInvited": "Convite enviado para {email}",
      "inviteAccepted": "{email} aceitou o convite",
      "inviteDeleted": "Convite de {email} removido",
      "memberUpdated": "Dados de {email} atualizados",
      "proposalCreated": "Proposta {proposal} criada",
      "proposalSent": "Proposta {proposal} enviada ao cliente",
      "proposalAccepted": "O cliente aceitou a proposta {proposal}",
      "proposalDeclined": "O cliente recusou a proposta {proposal}",
      "planChanged": "Plano alterado de {from} para {to}"
    }
  },
  "auth": {
    "signIn": {
      "title": "Bem-vindo de volta",
      "description": "Acesse sua conta para continuar gerando propostas e acompanhando clientes.",
      "fields": {
        "account": "Endereço da conta",
        "accountHint": "Criado no cadastro, por exemplo: minha-empresa.",
        "email": "E-mail corporativo",
        "password": "Senha"
      },
      "placeholders": {
        "account": "minha-empresa",
        "email": "nome@empresa.com"
      },
      "submit": "Entrar",
      "submitting": "Entrando...",
      "noAccount": "Não possui conta?",
      "createAccount": "Criar conta agora",
      "errors": {
        "invalid": "E-mail, senha ou endereço da conta incorretos.",
        "tooMany": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        "generic": "Não foi possível entrar. Tente novamente."
      }
    },
    "signUp": {
      "title": "Criar conta",
      "description": "Monte seu ambiente, defina o idioma padrão e convide a equipe para colaborar nas propostas.",
      "fields": {
        "company": "Nome da empresa",
        "email": "E-mail profissional",
        "password": "Senha",
        "passwordHint": "Use pelo menos 8 caracteres.",
        "locale": "Idioma padrão"
      },
      "placeholders": {
        "company": "Guindastes Horizonte",
        "email": "contato@empresa.com.br"
      },
      "submit": "Criar conta gratuita",
      "submitting": "Criando conta...",
      "hasAccount": "Já possui uma conta?",
      "signIn": "Entrar",
      "errors": {
        "invalid": "Confira o nome da empresa, o e-mail e a senha.",
        "tooMany": "Muitas contas criadas a partir desta rede. Tente novamente mais tarde.",
        "generic": "Não foi possível criar a conta. Tente novamente."
      }
    },
    "panel": {
      "title": "Do pedido do cliente à proposta aceita, no mesmo fluxo.",
      "description": "Monte a operação, gere o PDF com a sua marca e envie um link para o cliente aceitar ou recusar.",
      "loading": "Carregando sessão..."
    },
    "acceptInvite": {
      "checking": "Validando convite…",
      "wait": "Aguarde um instante.",
      "invalidTitle": "Este convite não pode ser usado",
      "invalid": {
        "missing": "O link está incompleto. Abra o link exatamente como recebido no e-mail.",
        "notFound": "Não encontramos este convite. Peça um novo link a quem convidou você.",
        "used": "Este convite já foi aceito. Entre com o seu e-mail e senha.",
        "expired": "Este convite expirou. Peça um novo link a quem convidou você.",
        "generic": "Não foi possível validar o convite. Tente novamente."
      },
      "goToSignIn": "Ir para o acesso",
      "title": "Bem-vindo(a) à {account}",
      "description": "Conclua seu cadastro e comece a colaborar com a equipe.",
      "fields": {
        "email": "E-mail",
        "name": "Nome completo",
        "password": "Defina uma senha",
        "passwordHint": "Use pelo menos 8 caracteres."
      },
      "placeholders": {
        "name": "Seu nome"
      },
      "submit": "Entrar na conta",
      "submitting": "Concluindo convite...",
      "submitError": "Não foi possível aceitar o convite. Tente novamente.",
      "trouble": "Problemas com o link?",
      "signIn": "Acesse com suas credenciais"
    }
  },
  "proposalSheet": {
    "number": "Proposta nº 0142",
    "title": "Içamento de treliças metálicas",
    "status": "Aceita",
    "equipment": "Guindaste 90 t",
    "site": "Porto de Santos, SP · 12 a 15 de maio",
    "mobilization": "Mobilização e desmobilização",
    "mobilizationValue": "R$ 8.500,00",
    "daily": "Diária operacional × 4 dias",
    "dailyValue": "R$ 24.800,00",
    "total": "Total",
    "totalValue": "R$ 33.300,00",
    "acceptedAt": "Aceita pelo cliente em 08/05, às 14:32"
  },
  "landing": {
    "signIn": "Entrar",
    "signUp": "Criar conta",
    "language": "Idioma",
    "eyebrow": "Guindaste, guincho, munck e outros serviços pesados",
    "title": "A proposta sai pronta para o cliente abrir e responder.",
    "description": "Cadastre o serviço, monte a operação e envie um link. O cliente vê o valor, baixa o PDF e aceita ou recusa.",
    "start": "Começar",
    "haveAccount": "Já tenho conta",
    "steps": {
      "build": {
        "title": "Monte a proposta",
        "text": "Escolha o cliente, o equipamento, o período e os valores. O total sai da mobilização mais a diária."
      },
      "pdf": {
        "title": "Gere o PDF",
        "text": "O documento sai com os dados da sua empresa, o escopo e as fotos da operação."
      },
      "send": {
        "title": "Envie o link",
        "text": "O cliente abre a proposta, baixa o PDF e aceita ou recusa sem criar conta."
      }
    }
  },
  "billing": {
    "errors": {
      "unavailable": "A cobrança online ainda não está configurada nesta instalação. Defina as chaves da Stripe para contratar planos.",
      "forbidden": "Somente quem administra o plano da conta pode contratar ou alterar planos.",
      "generic": "Não foi possível iniciar a cobrança agora. Tente novamente."
    },
    "usage": {
      "loadError": "Não foi possível carregar o uso atual.",
      "currentPlan": "Plano atual",
      "basicPlan": "Plano básico",
      "used": "Propostas geradas neste ciclo",
      "remaining": "{count, plural, one {Resta # proposta} other {Restam # propostas}} até {date}",
      "unlimited": "Propostas ilimitadas",
      "trialEnded": "Teste grátis encerrado. Escolha um plano para criar novas propostas."
    },
    "trial": {
      "activeTitle": "{count, plural, one {Falta # dia} other {Faltam # dias}} do seu teste grátis",
      "active": "Você pode criar até 10 propostas até {date}. Depois, escolha um plano para continuar.",
      "endedTitle": "Seu teste grátis terminou",
      "ended": "Escolha um plano para criar novas propostas. As propostas já enviadas continuam no ar, e o cliente ainda pode aceitar.",
      "cta": "Ver planos"
    }
  },
  "plans": {
    "title": "Planos",
    "description": "Escolha o plano ideal para o volume de propostas da sua empresa.",
    "loadError": "Não foi possível carregar os planos.",
    "current": "Plano atual",
    "subscribe": "Contratar",
    "perMonth": "{price} / mês",
    "perYear": "{price} / ano",
    "unlimited": "Propostas ilimitadas",
    "limit": "{count} propostas por mês",
    "noPermission": "Somente quem administra o plano pode contratar outro plano."
  },
  "services": {
    "page": {
      "title": "Catálogo de serviços",
      "description": "Organize equipamentos, pacotes e valores para montar propostas consistentes.",
      "loginNeeded": "Faça login para visualizar o catálogo.",
      "loadError": "Não foi possível carregar os serviços.",
      "newService": "Novo serviço",
      "capacity": "Capacidade {value} t",
      "noDetails": "Sem detalhes adicionais",
      "dailyRate": "Diária",
      "edit": "Editar",
      "deleteLabel": "Excluir {name}",
      "empty": {
        "title": "Nenhum serviço cadastrado ainda.",
        "description": "Adicione seus equipamentos e pacotes principais para reutilizar os valores nas propostas."
      }
    },
    "form": {
      "name": "Nome",
      "capacity": "Capacidade (t)",
      "rate": "Valor diário",
      "description": "Descrição",
      "notes": "Observações internas",
      "placeholders": {
        "name": "Ex.: Guindaste 50t",
        "capacity": "Ex.: 50",
        "rate": "Ex.: 2500",
        "description": "Resumo do serviço ou equipamento",
        "notes": "Links, restrições ou observações"
      },
      "cancel": "Cancelar",
      "save": "Salvar serviço",
      "saving": "Salvando...",
      "nameRequired": "Informe o nome do serviço.",
      "saveError": "Não foi possível salvar o serviço."
    },
    "newPage": {
      "title": "Novo serviço",
      "description": "Cadastre um equipamento ou pacote para reutilizar nas propostas."
    },
    "editDialog": {
      "title": "Editar serviço",
      "description": "Atualize as informações e elas serão refletidas nas próximas propostas.",
      "submit": "Salvar alterações"
    },
    "deleteDialog": {
      "title": "Remover serviço",
      "description": "Tem certeza que deseja remover “{name}”? Essa ação não pode ser desfeita.",
      "cancel": "Cancelar",
      "confirm": "Remover",
      "confirming": "Removendo...",
      "error": "Não foi possível remover o serviço."
    }
  },
  "publicProposal": {
    "notFound": {
      "title": "Proposta não encontrada",
      "description": "Verifique o link recebido ou peça um novo à empresa."
    }
  },
  "meta": {
    "description": "Propostas comerciais para guindaste, guincho, munck e outros serviços pesados."
  },
  "errors": {
    "invalid": "Confira os dados informados e tente novamente.",
    "unauthorized": "Sua sessão expirou. Entre novamente.",
    "forbidden": "Você não tem permissão para fazer isso.",
    "notFound": "Não encontramos este registro. Ele pode ter sido removido.",
    "conflict": "Já existe um registro com esses dados.",
    "tooMany": "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
    "unavailable": "Este recurso não está disponível agora.",
    "generic": "Algo deu errado. Tente novamente."
  },
  "clients": {
    "title": "Clientes",
    "description": "Centralize dados fiscais, limites de crédito e histórico para negociar com mais confiança.",
    "actions": {
      "add": "Adicionar cliente"
    },
    "warnings": {
      "tokenMissing": "Faça login para consultar os clientes."
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
        "edit": "Editar",
        "delete": "Excluir",
        "sendProposal": "Enviar proposta",
        "copyEmail": "Copiar e-mail",
        "copied": "Copiado",
        "noEmail": "E-mail não informado"
      }
    },
    "deleteDialog": {
      "title": "Excluir cliente",
      "description": "{name} será removido. As propostas já criadas para ele continuam salvas, sem cliente vinculado.",
      "confirm": "Excluir cliente"
    },
    "newPage": {
      "title": "Cadastrar cliente",
      "description": "Salve os dados do cliente para preencher propostas em segundos."
    },
    "dialog": {
      "title": "Adicionar cliente",
      "description": "Informe os dados principais para cadastrar um novo contato.",
      "editTitle": "Editar cliente",
      "editDescription": "Atualize os dados de contato deste cliente.",
      "close": "Fechar",
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
    "appName": "Cota",
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
      "recentLabel": "Buscas recentes"
    },
    "topbar": {
      "openSearch": "Abrir busca",
      "closeSearch": "Fechar busca",
      "openNotifications": "Ver notificações",
      "openNotificationsUnread": "Ver notificações ({count, plural, one {# não lida} other {# não lidas}})",
      "openLocale": "Alterar idioma",
      "searchHint": "Buscar propostas, clientes, modelos",
      "openUserMenu": "Abrir menu da conta",
      "signOut": "Sair",
      "language": "Idioma"
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
        "label": "Tempo até a resposta do cliente",
        "delta": "{value} vs. mês anterior",
        "minutes": "{value} min",
        "hours": "{value} h",
        "days": "{value, plural, one {# dia} other {# dias}}"
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
      "tokenMissing": "Faça login para carregar os dados."
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
    "account": "Minha Conta",
    "groups": {
      "home": "Início",
      "operations": "Operação",
      "sales": "Comercial",
      "company": "Empresa"
    },
    "usage": {
      "title": "Propostas no ciclo",
      "of": "{used} de {total}",
      "unlimited": "Plano ilimitado",
      "plans": "Ver planos"
    },
    "collapse": "Recolher menu",
    "expand": "Expandir menu",
    "openMenu": "Abrir menu",
    "closeMenu": "Fechar menu",
    "language": "Idioma da interface"
  },
  "notFound": {
    "title": "Página não encontrada",
    "description": "O endereço pode estar incorreto ou a página foi removida.",
    "dashboard": "Ir para o painel",
    "home": "Página inicial"
  },
  "notifications": {
    "title": "Notificações",
    "description": "Acompanhe quando clientes abrem e respondem propostas, PDFs ficam prontos e a equipe cresce.",
    "markAll": "Marcar todas como lidas",
    "empty": "Nenhuma notificação por enquanto. Avisaremos aqui quando um cliente abrir ou responder uma proposta.",
    "loadError": "Não foi possível carregar as notificações.",
    "unread": "Não lida",
    "tone": {
      "success": "Sucesso",
      "info": "Atualização",
      "warning": "Atenção",
      "danger": "Urgente"
    },
    "entries": {
      "proposalViewed": {
        "title": "Proposta visualizada",
        "body": "O cliente abriu a proposta {proposal}."
      },
      "proposalAccepted": {
        "title": "Proposta aceita",
        "body": "O cliente aceitou a proposta {proposal}."
      },
      "proposalDeclined": {
        "title": "Proposta recusada",
        "body": "O cliente recusou a proposta {proposal}."
      },
      "proposalPdfReady": {
        "title": "PDF pronto",
        "body": "O PDF da proposta {proposal} está pronto para download."
      },
      "inviteAccepted": {
        "title": "Convite aceito",
        "body": "{member} entrou na equipe."
      }
    }
  },
  "reports": {
    "page": {
      "alerts": {
        "missingToken": "Faça login para consultar seus dados.",
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
      "totalSent": "{value} propostas no período",
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
          "noClient": "Sem cliente",
          "title": "Receita por cliente",
          "badge": "Top 5",
          "total": "Total {value}",
          "empty": "Nenhum cliente com propostas aceitas ainda."
        },
        "team": {
          "title": "Propostas por consultor",
          "badge": "Total vs Aceitas",
          "legendTotal": "Propostas",
          "legendAccepted": "Aceitas",
          "empty": "Nenhuma proposta atribuída a membros."
        },
        "cityRevenue": {
          "noCity": "Sem local",
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
            "cycle": "Tempo médio até a resposta do cliente",
            "segment": "Propostas por status"
          },
          "errors": {
            "intent": "Descreva o que deseja analisar.",
            "auth": "Autentique-se para gerar relatórios.",
            "unexpected": "Erro inesperado ao gerar relatório.",
              "unsupported": "Ainda não sabemos responder essa pergunta. Pergunte sobre taxa de conversão, receita por cliente, tempo até a resposta, propostas por consultor ou por status."
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
          "waitingTitle": "Aguardando geração",
            "columns": {
              "conversionByMonth": {
                "name": "Mês",
                "value": "Taxa de conversão"
              },
              "conversionByMember": {
                "name": "Consultor",
                "value": "Taxa de conversão"
              },
              "revenueByClient": {
                "name": "Cliente",
                "value": "Receita aceita"
              },
              "daysToAnswer": {
                "name": "Mês de envio",
                "value": "Dias até a resposta"
              },
              "proposalsByMember": {
                "name": "Consultor",
                "value": "Propostas"
              },
              "proposalsByStatus": {
                "name": "Status",
                "value": "Propostas"
              }
            },
            "days": "{count, plural, one {# dia} other {# dias}}",
            "lessThanDay": "menos de 1 dia",
            "empty": "Nenhum dado no período escolhido."
        }
      }
    },
    "states": {
      "error": "Não foi possível carregar o relatório."
    },
    "dateRange": {
      "from": "Início",
      "to": "Fim",
      "clear": "Limpar",
      "presets": {
        "last7": "Últimos 7 dias",
        "last30": "Últimos 30 dias",
        "thisMonth": "Este mês",
        "lastMonth": "Mês passado",
        "ytd": "Ano até hoje"
      }
    }
  },
  "templates": {
    "dialog": {
      "title": "Criar modelo",
      "description": "Defina um layout que possa ser reutilizado nas propostas da equipe.",
      "editTitle": "Editar modelo",
      "editDescription": "Altere o nome, a descrição ou o HTML deste modelo.",
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
        "save": "Salvar alterações",
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
        "missingToken": "Faça login para carregar os modelos.",
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
          "description": "Importe um layout em HTML"
        }
      },
      "filters": {
        "category": {
          "all": "Todos os segmentos"
        },
        "search": "Buscar modelos"
      },
      "upload": {
        "description": "Escolha um arquivo HTML para transformá-lo em modelo. Use variáveis como '{{company.name}}' e '{{job.projectName}}' onde os dados da proposta devem aparecer.",
        "button": "Carregar arquivo",
        "invalid": "O arquivo está vazio ou não é um HTML válido."
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
    },
    "detail": {
      "titleFallback": "Modelo",
      "descriptionFallback": "Autentique-se para visualizar os detalhes completos do modelo.",
      "backButton": "Voltar para modelos",
      "loadingTitle": "Carregando modelo…",
      "loadingDescription": "Buscando informações do modelo.",
      "defaultDescription": "Detalhes do modelo",
      "actions": {
        "edit": "Editar",
        "delete": "Excluir modelo",
        "useTemplate": "Usar este modelo",
        "duplicate": "Duplicar modelo",
        "duplicating": "Duplicando..."
      },
      "alerts": {
        "missingToken": "Autentique-se ou informe um token de API para acessar os modelos."
      },
      "badges": {
        "system": "Modelo curado",
        "custom": "Modelo da equipe"
      },
      "info": {
        "title": "Informações do modelo",
        "locale": "Idioma",
        "category": "Categoria",
        "createdAt": "Criado em",
        "updatedAt": "Atualizado em"
      },
      "preview": {
        "title": "Pré-visualização",
        "subtitle": "HTML renderizado"
      },
      "locales": {
        "ptBR": "Português",
        "en": "Inglês"
      },
      "duplicateSuffix": "(cópia)",
      "duplicateSuccess": "Modelo duplicado. Redirecionando para Meus modelos...",
      "deleteDialog": {
        "title": "Excluir modelo",
        "description": "{name} sai da sua lista de modelos. As propostas já criadas com ele não mudam.",
        "cancel": "Cancelar",
        "confirm": "Excluir modelo"
      },
      "updateSuccess": "Modelo atualizado.",
      "errors": {
        "load": "Não foi possível carregar o modelo: {message}",
        "notFound": "Modelo não encontrado ou removido.",
        "duplicate": "Não foi possível duplicar este modelo.",
        "unavailable": "Os dados do modelo ainda não estão disponíveis."
      }
    },
    "builder": {
      "title": "Editor visual de modelos",
      "description": "Monte layouts para web ou PDF arrastando blocos reutilizáveis.",
      "back": "Voltar para modelos",
      "blocksTitle": "Blocos",
      "blocksHint": "Clique para adicionar um componente ao layout.",
      "dataBlocksTitle": "Dados da proposta",
      "dataBlocksHint": "Preenchidos com o que for informado ao criar cada proposta.",
      "dataBlocks": {
        "company": "Nome, slogan e contato da sua empresa (Minha conta).",
        "client": "Nome, empresa, e-mail e telefone do cliente.",
        "job": "Projeto, local e período da operação.",
        "scope": "Itens do escopo, equipamentos e equipe.",
        "investment": "Mobilização, diária × dias e total.",
        "photos": "Fotos anexadas à proposta.",
        "terms": "Condições gerais da proposta."
      },
      "blocks": {
        "heading": "Título",
        "paragraph": "Parágrafo",
        "image": "Imagem",
        "divider": "Divisor",
        "pricing": "Tabela de preços",
        "button": "Botão CTA",
        "signature": "Assinatura",
        "company": "Empresa",
        "client": "Cliente",
        "job": "Operação",
        "scope": "Escopo e recursos",
        "investment": "Investimento",
        "photos": "Fotos",
        "terms": "Condições"
      },
      "export": {
        "title": "Exportar",
        "html": "Exportar HTML",
        "pdf": "Exportar PDF"
      },
      "empty": {
        "title": "Nenhum conteúdo ainda",
        "description": "Adicione blocos ao layout para visualizar a prévia."
      },
      "blockActions": {
        "moveUp": "Mover para cima",
        "moveDown": "Mover para baixo",
        "edit": "Editar",
        "remove": "Remover bloco"
      },
      "details": {
        "title": "Detalhes do modelo",
        "name": "Nome",
        "namePlaceholder": "Ex.: Proposta corporativa",
        "description": "Descrição",
        "descriptionPlaceholder": "Breve resumo do modelo",
        "category": "Categoria",
        "categoryPlaceholder": "Ex.: Comercial",
        "language": "Idioma do documento",
        "hint": "Essas informações aparecem na lista de modelos."
      },
      "editor": {
        "title": "Editar bloco",
        "content": "Conteúdo",
        "imageUrl": "URL da imagem",
        "items": "Itens",
        "itemLabel": "Descrição",
        "itemValue": "Valor",
        "addItem": "Adicionar item",
        "buttonText": "Texto do botão",
        "buttonLink": "Link",
        "done": "Encerrar edição",
        "noSelection": "Selecione um bloco para editar.",
        "automatic": "Este bloco é preenchido automaticamente com os dados de cada proposta."
      },
      "save": "Salvar modelo",
      "saved": "Modelo salvo com sucesso!",
      "saveError": "Não foi possível salvar o modelo.",
      "previewAlt": "Prévia"
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
        "missingToken": "Faça login para visualizar as propostas.",
        "loadError": "Não foi possível carregar as propostas: {message}"
      },
      "header": {
        "title": "Minhas propostas",
        "description": "Acompanhe status, gere PDFs e compartilhe links rápidos com seus clientes."
      },
      "actions": {
        "create": "Criar proposta"
      },
      "filters": {
        "search": "Buscar cliente ou título",
        "all": "Todas",
        "empty": "Nenhuma proposta com esse filtro.",
        "clear": "Limpar"
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
        "copyLink": "Copiar link",
        "linkCopied": "Link copiado"
      }
    },
    "wizard": {
      "title": "Nova proposta",
      "description": "Escolha um modelo, detalhe a operação, defina os valores e gere o PDF para enviar ao cliente.",
      "noPermission": "Seu departamento não tem permissão para criar propostas.",
      "steps": {
        "template": {
          "title": "Escolher modelo",
          "description": "Use um modelo ou comece do zero."
        },
        "details": {
          "title": "Detalhar operação",
          "description": "Cliente, local, período, escopo e recursos."
        },
        "values": {
          "title": "Valores",
          "description": "Mobilização, diária e condições comerciais."
        },
        "review": {
          "title": "Revisar & anexar",
          "description": "Fotos, revisão final e geração do PDF."
        }
      },
      "blank": {
        "title": "Começar do zero",
        "description": "Usa o layout padrão com todos os campos em branco para você preencher.",
        "action": "Usar proposta em branco"
      },
      "templateCard": {
        "select": "Selecionar modelo",
        "selected": "Selecionado",
        "mine": "Meu modelo",
        "standard": "Modelo padrão"
      },
      "summary": {
        "title": "Resumo",
        "client": "Cliente",
        "template": "Modelo",
        "project": "Projeto",
        "site": "Local",
        "period": "Período",
        "total": "Total"
      },
      "fields": {
        "client": "Cliente",
        "noClients": "Nenhum cliente cadastrado",
        "addClient": "Adicionar",
        "title": "Título / nome do projeto",
        "titlePlaceholder": "Montagem de estrutura metálica - Galpão X",
        "site": "Local da operação",
        "sitePlaceholder": "Porto de Santos, SP",
        "start": "Data de início",
        "end": "Data de término",
        "scope": "Escopo do serviço",
        "scopePlaceholder": "Içamento e posicionamento de treliças\nSupervisor técnico durante o turno",
        "onePerLine": "Um item por linha.",
        "equipment": "Equipamentos",
        "equipmentPlaceholder": "Outros equipamentos (um por linha)",
        "team": "Equipe e certificações",
        "teamPlaceholder": "Operador de guindaste certificado\nRigger responsável com ART",
        "mobilization": "Mobilização",
        "mobilizationHint": "Ida e volta do equipamento.",
        "dailyRate": "Diária operacional",
        "days": "Dias de operação",
        "validity": "Validade da proposta (dias)",
        "terms": "Condições gerais",
        "termsHint": "Uma condição por linha.",
        "termsPlaceholder": "Pagamento: 40% na confirmação + 60% após a conclusão\nOperação sujeita a condições climáticas"
      },
      "investment": {
        "title": "Investimento",
        "mobilization": "Mobilização",
        "daily": "{count, plural, one {Diária × # dia} other {Diária × # dias}}",
        "total": "Total"
      },
      "photos": {
        "title": "Fotos da operação",
        "description": "Até {max} fotos, aparecem no PDF.",
        "hint": "JPG ou PNG, até 5 MB por foto",
        "none": "Nenhuma foto selecionada.",
        "tooBig": "Algumas fotos foram ignoradas por passarem de 5 MB."
      },
      "checklist": {
        "title": "Antes de gerar",
        "review": "Revise escopo e valores",
        "confirm": "Confirme equipamentos e datas",
        "company": "Confira os dados da empresa em Minha conta"
      },
      "actions": {
        "generate": "Gerar proposta e PDF",
        "generating": "Gerando...",
        "draft": "Salvar rascunho",
        "saving": "Salvando...",
        "back": "Voltar",
        "next": "Continuar",
        "step": "Etapa {current} de {total}"
      },
      "errors": {
        "noTemplate": "Nenhum modelo padrão disponível para começar do zero.",
        "selectTemplate": "Selecione um modelo antes de continuar.",
        "photoUpload": "Falha ao enviar a foto {name}.",
        "photosNotAttached": "A proposta foi criada, mas as fotos não foram anexadas. Abra a proposta para tentar de novo.",
        "finish": "Não foi possível finalizar a proposta.",
        "limit": "Você atingiu o limite de propostas do seu plano neste mês. Escolha um plano maior para continuar.",
        "trialEnded": "Seu teste grátis terminou. Escolha um plano em Planos para criar novas propostas."
      },
      "addClient": {
        "title": "Adicionar cliente",
        "description": "Cadastre um cliente sem sair da criação da proposta.",
        "name": "Nome",
        "company": "Empresa",
        "optional": "opcional",
        "cancel": "Cancelar",
        "submit": "Cadastrar cliente"
      }
    },
    "detail": {
      "titleFallback": "Detalhe da proposta",
      "header": {
        "description": "Cliente: {client} · Criada em {date}",
        "loading": "Carregando detalhes da proposta..."
      },
      "loginNeeded": "Faça login para ver os detalhes da proposta.",
      "notFound": {
        "title": "Proposta não encontrada",
        "description": "Ela pode ter sido removida ou você não possui permissão para visualizá-la."
      },
      "meta": {
        "client": "Cliente",
        "template": "Modelo",
        "language": "Idioma",
        "expires": "Expira em",
        "updated": "Atualizada em {date}",
        "publicLink": "Link público",
        "publicLinkLater": "O cliente consegue abrir o link depois que a proposta for enviada."
      },
      "summary": {
        "title": "Resumo da operação",
        "project": "Projeto",
        "site": "Local da operação",
        "period": "Período",
        "days": "Dias de operação",
        "total": "Valor total"
      },
      "payload": {
        "title": "Dados enviados",
        "empty": "Nenhum dado adicional foi informado para esta proposta."
      },
      "timeline": {
        "title": "Linha do tempo",
        "created": "Criada",
        "sent": "Enviada",
        "viewed": "Visualizada",
        "accepted": "Aceita",
        "declined": "Recusada"
      },
      "files": {
        "title": "PDF e anexos",
        "download": "Baixar PDF da proposta",
        "notReady": "Ainda não disponível. Clique em \"Gerar PDF\" para criar o arquivo.",
        "attachments": "Anexos",
        "noAttachments": "Nenhum anexo foi associado a esta proposta até o momento.",
        "photoAlt": "Foto {number} da operação",
        "file": "Arquivo {number}"
      },
      "actions": {
        "generate": "Gerar PDF",
        "regenerate": "Regerar PDF",
        "generating": "Gerando PDF...",
        "download": "Baixar PDF",
        "send": "Enviar ao cliente",
        "copy": "Copiar link público",
        "copied": "Link copiado"
      },
      "banners": {
        "pdfSlow": "O PDF está demorando mais que o esperado. Tente novamente em instantes.",
        "pdfReady": "PDF pronto para download.",
        "pdfQueued": "Gerando o PDF. Ele aparece aqui em alguns segundos.",
        "pdfError": "Não foi possível gerar o PDF agora.",
        "linkCopied": "Link público copiado. Envie para o cliente visualizar e responder.",
        "sentCopyLink": "Proposta enviada. Copie o link: {link}",
        "sendError": "Não foi possível enviar a proposta.",
        "downloadError": "Não foi possível baixar o PDF.",
        "noPublicLink": "Proposta sem link público."
      }
    }
  },
  "crm": {
    "page": {
      "alerts": {
        "missingToken": "Faça login para visualizar o pipeline.",
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
        "dragHint": "Arraste e solte cards para movimentar leads entre etapas."
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
      },
      "board": {
        "emptyStage": "Nenhum lead nesta etapa."
      },
      "leadDetails": {
        "stage": "Etapa: {stage}",
        "contact": "Contato",
        "email": "E-mail",
        "phone": "Telefone",
        "value": "Valor estimado",
        "notes": "Notas"
      },
      "leadDialog": {
        "title": "Novo lead",
        "fields": {
          "company": "Empresa",
          "contact": "Contato",
          "email": "E-mail",
          "phone": "Telefone",
          "value": "Valor estimado",
          "stage": "Etapa",
          "notes": "Notas"
        },
        "placeholders": {
          "company": "Nome da empresa",
          "contact": "Nome do contato"
        },
        "cancel": "Cancelar",
        "save": "Salvar lead",
        "saving": "Salvando..."
      },
      "customize": {
        "title": "Personalizar etapas",
        "description": "Renomeie, reordene ou ajuste as cores das etapas do pipeline. Remova apenas etapas sem leads.",
        "empty": "Nenhuma etapa cadastrada ainda. Adicione uma nova etapa abaixo.",
        "stageName": "Nome da etapa",
        "color": "Cor",
        "leadCount": "{count, plural, one {# lead} other {# leads}}",
        "moveUp": "Mover para cima",
        "moveDown": "Mover para baixo",
        "delete": "Excluir etapa",
        "deleteBlocked": "Remova os leads desta etapa antes de excluir.",
        "newStage": "Nova etapa",
        "newStageName": "Nome da nova etapa",
        "newStagePlaceholder": "Ex.: Follow-up",
        "newStageColor": "Cor da nova etapa",
        "add": "Adicionar",
        "adding": "Adicionando...",
        "done": "Concluir",
        "nameTooShort": "O nome da etapa precisa ter pelo menos 2 caracteres."
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
    },
    "company": {
      "title": "Dados da empresa",
      "description": "Estas informações aparecem no cabeçalho e no rodapé de todas as propostas.",
      "accountId": "Endereço da conta (usado no login):",
      "fields": {
        "name": "Nome da empresa",
        "cnpj": "CNPJ",
        "phone": "Telefone",
        "email": "E-mail comercial",
        "address": "Endereço",
        "tagline": "Slogan"
      },
      "placeholders": {
        "name": "Guindastes Exemplo Ltda",
        "cnpj": "00.000.000/0001-00",
        "phone": "(11) 0000-0000",
        "email": "contato@empresa.com.br",
        "address": "Rua, número - Cidade/UF",
        "tagline": "Içamentos com segurança e precisão"
      },
      "save": "Salvar dados da empresa",
      "saving": "Salvando...",
      "saved": "Dados da empresa atualizados.",
      "error": "Não foi possível salvar os dados da empresa.",
      "ownerOnly": "Somente o proprietário da conta pode alterar estes dados."
    },
    "deleteAccount": {
      "title": "Excluir conta",
      "description": "Apaga o workspace, a equipe, os clientes, as propostas, as fotos e os PDFs, e cancela a assinatura. Não é possível desfazer.",
      "confirmLabel": "Digite {slug} para confirmar",
      "password": "Sua senha",
      "submit": "Excluir conta e todos os dados",
      "submitting": "Excluindo...",
      "errors": {
        "slug": "A confirmação não corresponde ao endereço da conta.",
        "password": "Senha incorreta.",
        "billing": "Não foi possível cancelar a assinatura. Tente novamente.",
        "generic": "Não foi possível excluir a conta. Tente novamente."
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
      "missingToken": "Faça login para visualizar a equipe.",
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
      "pendingBadge": "Convite pendente",
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
    },
    "inviteErrors": {
      "duplicate": "Já existe alguém com este e-mail na equipe.",
      "invalidDepartment": "Escolha um departamento válido.",
      "generic": "Não foi possível enviar o convite. Tente novamente."
    }
  }
} as const;
