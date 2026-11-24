import { slugifyTitle } from './fingerprint';

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  linkedin_posts: 'LinkedIn',
  gupy: 'Gupy',
  catho: 'Catho',
  indeed: 'Indeed',
  google_jobs: 'Google Jobs',
  telegram: 'Telegram',
  programathor: 'Programathor',
  remotar: 'Remotar',
  glassdoor: 'Glassdoor',
  sao_jose: 'São José Empregos',
  vagas_sc: 'Vagas SC',
  vagas_floripa: 'Vagas Floripa',
  emprega_palhoca: 'Emprega Palhoça',
  infojobs: 'InfoJobs',
  chawork: 'Chawork',
  trabalha_brasil: 'Trabalha Brasil',
  bne: 'BNE',
  empregos: 'Empregos.com.br',
  recruta_simples: 'Recruta Simples',
  recrutei_empregos: 'Recrutei',
  quickin: 'Quickin',
  recrutei_jobs: 'PeoplePlan',
  pandape: 'PandaPé',
  '99freelas': '99Freelas',
  workana: 'Workana',
  geekhunter: 'GeekHunter',
  nerdin: 'Nerdin',
  revelo: 'Revelo',
  '99jobs': '99jobs',
  solides: 'Sólides',
  runtalent: 'RunTalent',
  empregare: 'Empregare',
  trampos: 'Trampos.co',
  facebook_groups: 'Facebook Groups',
};

const SENTINEL_VALUES = new Set([
  'não informado',
  'nao informado',
  'não especificado',
  'nao especificado',
  'n/a',
  '-',
]);

export function formatPlatformLabel(platform?: string | null): string {
  const normalized = platform?.trim().toLowerCase();
  if (!normalized) {
    return 'Portal';
  }

  if (PLATFORM_LABELS[normalized]) {
    return PLATFORM_LABELS[normalized];
  }

  const cleaned = normalized.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) {
    return 'Portal';
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeOptionalJobField(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (SENTINEL_VALUES.has(trimmed.toLowerCase())) {
    return null;
  }

  return trimmed;
}

export function getSafeExternalJobUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function buildPublicJobSlug(title: string, id: string): string {
  const baseSlug = slugifyTitle(title) || 'vaga';
  const shortId = (id || '').trim().slice(0, 8);
  return shortId ? `${baseSlug}-${shortId}` : baseSlug;
}

function parseValidDate(input?: string | null): Date | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativePublishedAtPtBr(
  publishedAt?: string | null,
  createdAt?: string | null
): string {
  const target = parseValidDate(publishedAt) ?? parseValidDate(createdAt);
  if (!target) {
    return '';
  }

  const diffMs = Math.max(0, Date.now() - target.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Hoje';
  }
  if (diffDays === 1) {
    return 'Ontem';
  }
  if (diffDays <= 6) {
    return `Há ${diffDays} dias`;
  }
  if (diffDays <= 29) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? 'Há 1 semana' : `Há ${weeks} semanas`;
  }

  return target.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function buildVagasHref(params: { q?: string; page?: number } = {}): string {
  const search = new URLSearchParams();
  const trimmedQ = params.q?.trim() || '';
  if (trimmedQ) {
    search.set('q', trimmedQ);
  }

  const pageNum = params.page ? Math.trunc(params.page) : 1;
  if (pageNum > 1) {
    search.set('page', String(pageNum));
  }

  const qs = search.toString();
  return qs ? `/vagas?${qs}` : '/vagas';
}

export function computePaginationPages(
  currentPage: number,
  totalPages: number
): Array<number | 'ellipsis'> {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return [];
  }

  const safeTotal = Math.trunc(totalPages);
  if (safeTotal <= 0) {
    return [];
  }

  const safePage = Math.min(safeTotal, Math.max(1, Math.trunc(currentPage) || 1));

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const windowStart = Math.max(2, safePage - 1);
  const windowEnd = Math.min(safeTotal - 1, safePage + 1);

  if (windowStart > 2) {
    pages.push('ellipsis');
  }

  for (let p = windowStart; p <= windowEnd; p++) {
    pages.push(p);
  }

  if (windowEnd < safeTotal - 1) {
    pages.push('ellipsis');
  }

  pages.push(safeTotal);
  return pages;
}
