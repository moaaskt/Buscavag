export const UNLIMITED_QUOTA_VALUE = 999999;

export interface PlanTierLimits {
  tier: 'free' | 'premium';
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxSavedJobs: number;
  maxRecommendedJobsUnlocked: number;
  unlimitedAiCvAnalysis: boolean;
  priorityMatching: boolean;
  exportJobs: boolean;
  isUnlimited: boolean;
  features: string[];
}

export const SAAS_PLANS: Record<'free' | 'premium', PlanTierLimits> = {
  free: {
    tier: 'free',
    name: 'Personal Workspace',
    priceMonthly: 0,
    priceAnnual: 0,
    maxSavedJobs: UNLIMITED_QUOTA_VALUE,
    maxRecommendedJobsUnlocked: UNLIMITED_QUOTA_VALUE,
    unlimitedAiCvAnalysis: true,
    priorityMatching: true,
    exportJobs: true,
    isUnlimited: true,
    features: [
      'Acesso irrestrito ao Explorador de Vagas das 34 fontes',
      'Vagas salvas e favoritadas ilimitadas',
      'Todas as Vagas Recomendadas desbloqueadas com Match IA',
      'Diagnósticos e reanálises de currículo com IA ilimitadas',
      'Filtros avançados por Localização e Senioridade',
    ],
  },
  premium: {
    tier: 'premium',
    name: 'Personal Workspace',
    priceMonthly: 0,
    priceAnnual: 0,
    maxSavedJobs: UNLIMITED_QUOTA_VALUE,
    maxRecommendedJobsUnlocked: UNLIMITED_QUOTA_VALUE,
    unlimitedAiCvAnalysis: true,
    priorityMatching: true,
    exportJobs: true,
    isUnlimited: true,
    features: [
      'Todas as centenas de Vagas Recomendadas desbloqueadas',
      'Vagas salvas ilimitadas',
      'Diagnósticos e reanálises de currículo com IA ilimitadas',
      'Dicas e recomendações personalizadas para ATS',
      'Alerta de Super Matches prioritários em tempo real',
      'Exportação de relatórios de candidaturas',
    ],
  },
};

export function getTierLimits(tier: 'free' | 'premium' | string): PlanTierLimits {
  if (tier === 'free') return SAAS_PLANS.free;
  return SAAS_PLANS.premium;
}

export function canUserSaveMoreJobs(currentSavedCount: number, _tier?: 'free' | 'premium' | string): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  isUnlimited: boolean;
} {
  return {
    allowed: true,
    maxAllowed: UNLIMITED_QUOTA_VALUE,
    currentCount: currentSavedCount,
    isUnlimited: true,
  };
}
