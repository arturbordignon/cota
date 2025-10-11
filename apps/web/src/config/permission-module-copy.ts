import { permissionModules, type PermissionModuleKey } from './permission-modules';

export interface PermissionModuleCopy {
  label: string;
  description: string;
}

const copyMap: Record<PermissionModuleKey, PermissionModuleCopy> = {
  dashboard: { label: 'Painel', description: 'Resumo geral de desempenho.' },
  proposals: { label: 'Propostas', description: 'Criação, edição e envio de propostas.' },
  templates: { label: 'Modelos', description: 'Biblioteca de modelos personalizados.' },
  crm: { label: 'Pipeline', description: 'Kanban e relacionamento comercial.' },
  reports: { label: 'Relatórios', description: 'Consultas dinâmicas e métricas.' },
  plan: { label: 'Planos', description: 'Gestão de assinatura e cobrança.' },
  clients: { label: 'Clientes', description: 'Cadastro e detalhes dos clientes.' },
  services: { label: 'Serviços', description: 'Catálogo de serviços oferecidos.' },
};

export function getPermissionModuleCopy(module: PermissionModuleKey): PermissionModuleCopy {
  return copyMap[module] ?? { label: module, description: '' };
}

export const permissionModuleCopy: Record<PermissionModuleKey, PermissionModuleCopy> = permissionModules.reduce(
  (acc, module) => {
    acc[module] = getPermissionModuleCopy(module);
    return acc;
  },
  {} as Record<PermissionModuleKey, PermissionModuleCopy>
);
