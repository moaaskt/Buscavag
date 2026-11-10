import {
  BriefcaseIcon,
  Columns3Icon,
  UserCircle2Icon,
  BotIcon,
  TerminalSquareIcon,
  SlidersHorizontalIcon,
  DatabaseIcon,
  Building2Icon,
  ScrollTextIcon,
  MessageSquareIcon,
  RadioIcon,
  Users2Icon,
  CreditCardIcon,
  BarChart3Icon,
  type LucideIcon,
} from 'lucide-react';

export interface WorkspaceNavItem {
  id: string;
  title: string;
  href: string;
  legacyHref: string;
  legacyTitle: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: string;
  description: string;
}

export interface WorkspaceNavGroup {
  id: string;
  title: string;
  adminOnly?: boolean;
  items: WorkspaceNavItem[];
}

export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    id: 'carreira',
    title: 'Minha Carreira',
    adminOnly: false,
    items: [
      {
        id: 'carreira-vagas',
        title: 'Vagas & Matching',
        href: '/workspace/carreira',
        legacyHref: '/candidate',
        legacyTitle: 'Painel do Candidato (/candidate)',
        icon: BriefcaseIcon,
        badge: 'IA Match',
        description: 'Feed inteligente de vagas aderentes ao seu perfil técnico com score de compatibilidade.',
      },
      {
        id: 'carreira-kanban',
        title: 'Kanban de Candidaturas',
        href: '/workspace/carreira/kanban',
        legacyHref: '/board',
        legacyTitle: 'Quadro Kanban (/board)',
        icon: Columns3Icon,
        description: 'Acompanhamento visual do pipeline de processos seletivos e candidaturas em andamento.',
      },
      {
        id: 'carreira-perfil',
        title: 'Perfil & Currículo',
        href: '/workspace/carreira/perfil',
        legacyHref: '/candidate',
        legacyTitle: 'Gestão de Currículo (/candidate)',
        icon: UserCircle2Icon,
        description: 'Extração de competências por IA, histórico profissional e currículo sincronizado.',
      },
    ],
  },
  {
    id: 'operacao',
    title: 'Operação e Coleta',
    adminOnly: true,
    items: [
      {
        id: 'operacao-scrapers',
        title: 'Central de Scrapers',
        href: '/workspace/operacao/scrapers',
        legacyHref: '/admin/scrapers',
        legacyTitle: 'Painel de Scrapers (/admin/scrapers)',
        icon: BotIcon,
        badge: '34 fontes',
        description: 'Monitoramento e disparo de coletores de vagas em LinkedIn, Facebook, Gupy e plataformas.',
      },
      {
        id: 'operacao-terminal',
        title: 'Terminal SSE em Tempo Real',
        href: '/workspace/operacao/terminal',
        legacyHref: '/admin/scrapers/terminal',
        legacyTitle: 'Console SSE (/admin/scrapers/terminal)',
        icon: TerminalSquareIcon,
        badge: 'Live',
        description: 'Streaming contínuo de logs de execução e eventos dos scrapers em tempo real.',
      },
      {
        id: 'operacao-config',
        title: 'Configurações de Coleta',
        href: '/workspace/operacao/config',
        legacyHref: '/admin/scrapers/config',
        legacyTitle: 'Configuração dos Scrapers (/admin/scrapers/config)',
        icon: SlidersHorizontalIcon,
        description: 'Intervalos de cron, cabeçalhos HTTP, proxies e parâmetros operacionais de scraping.',
      },
    ],
  },
  {
    id: 'inteligencia',
    title: 'Inteligência',
    adminOnly: true,
    items: [
      {
        id: 'inteligencia-vagas',
        title: 'Banco de Vagas Tech',
        href: '/workspace/inteligencia/vagas',
        legacyHref: '/admin/vagas',
        legacyTitle: 'Gestão Geral de Vagas (/admin/vagas)',
        icon: DatabaseIcon,
        description: 'Deduplicação, expurgo de vagas não-tech, curadoria e auditoria dos registros do banco.',
      },
      {
        id: 'inteligencia-empresas',
        title: 'Empresas Parceiras',
        href: '/workspace/inteligencia/empresas',
        legacyHref: '/admin/empresas',
        legacyTitle: 'Gestão de Empresas (/admin/empresas)',
        icon: Building2Icon,
        description: 'Mapeamento de empresas contratantes, parcerias B2B e estatísticas de contratação.',
      },
      {
        id: 'inteligencia-logs',
        title: 'Logs de Auditoria',
        href: '/workspace/inteligencia/logs',
        legacyHref: '/admin/logs',
        legacyTitle: 'Logs do Sistema (/admin/logs)',
        icon: ScrollTextIcon,
        description: 'Trilha de auditoria administrativa, segurança, acessos e operações críticas.',
      },
    ],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    adminOnly: true,
    items: [
      {
        id: 'comunicacao-hub',
        title: 'Hub de Mensageria',
        href: '/workspace/comunicacao',
        legacyHref: '/admin/mensageria',
        legacyTitle: 'Central de Mensageria (/admin/mensageria)',
        icon: MessageSquareIcon,
        description: 'Disparo de alertas e relatórios automatizados para canais configurados.',
      },
      {
        id: 'comunicacao-canais',
        title: 'Canais Telegram & WhatsApp',
        href: '/workspace/comunicacao/canais',
        legacyHref: '/admin/mensageria',
        legacyTitle: 'Canais de Notificação (/admin/mensageria)',
        icon: RadioIcon,
        badge: 'Bots',
        description: 'Gestão de webhooks, templates de mensagens e status de conexão com APIs do Telegram e WhatsApp.',
      },
    ],
  },
  {
    id: 'gestao',
    title: 'Configurações e Gestão',
    adminOnly: true,
    items: [
      {
        id: 'gestao-usuarios',
        title: 'Gestão de Usuários & RBAC',
        href: '/workspace/gestao/usuarios',
        legacyHref: '/admin/usuarios',
        legacyTitle: 'Gestão de Usuários (/admin/usuarios)',
        icon: Users2Icon,
        description: 'Permissões administrativas, controle de acesso e auditoria de contas.',
      },
      {
        id: 'gestao-pagamentos',
        title: 'Assinaturas & Planos',
        href: '/workspace/gestao/pagamentos',
        legacyHref: '/admin/pagamentos',
        legacyTitle: 'Gestão Financeira (/admin/pagamentos)',
        icon: CreditCardIcon,
        description: 'Histórico de transações, webhooks de pagamento e controle de planos do sistema.',
      },
      {
        id: 'gestao-metricas',
        title: 'Métricas da Plataforma',
        href: '/workspace/gestao/metricas',
        legacyHref: '/admin/dashboard',
        legacyTitle: 'Dashboard Administrativa (/admin/dashboard)',
        icon: BarChart3Icon,
        description: 'Visão executiva de crescimento, engajamento e métricas de desempenho do sistema.',
      },
    ],
  },
];

