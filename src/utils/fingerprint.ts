import crypto from 'crypto';

/**
 * Remove acentuação/diacríticos e converte para minúsculas.
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Gera slug normalizado de título de vaga, removendo ruídos frequentes
 * inseridos por portais e scrapers (ex: [Vaga], (PCD), Candidatar-se, etc).
 */
export function slugifyTitle(title: string): string {
  let cleaned = cleanText(title);

  // 1. Remover ruídos explícitos de scrapers e tags
  cleaned = cleaned
    .replace(/\[\s*[^\]]*(?:vaga|remoto|hibrido|presencial|home\s*office|pcd|pj|clt|freela|urgente|afirmativa)[^\]]*\]/gi, ' ')
    .replace(/\(\s*[^)]*(?:remoto|hibrido|presencial|home\s*office|pcd|pj|clt|urgente|afirmativa)[^)]*\)/gi, ' ')
    .replace(/(candidatar\s*-?\s*se|candidate\s*-?\s*se)/gi, ' ')
    .replace(/\b(vaga exclusiva para pcd|vaga pcd|vaga afirmativa|vaga aberta)\b/gi, ' ')
    .replace(/\b(vaga|oportunidade|banco de talentos|processo seletivo)\b/gi, ' ');

  // 2. Substituir separadores e caracteres não alfanuméricos por espaço
  cleaned = cleaned.replace(/[^a-z0-9]+/g, ' ').trim();

  // 3. Compactar espaços e gerar slug
  return cleaned.split(/\s+/).filter(Boolean).join('-');
}

/**
 * Gera slug normalizado do nome da empresa, removendo sufixos jurídicos
 * e prefixos de plataformas agregadoras.
 */
export function slugifyCompany(company: string): string {
  let cleaned = cleanText(company);

  // 1. Remover prefixos de fontes/redes agregadoras (ex: Facebook: Programadores Brasil)
  cleaned = cleaned.replace(/^(facebook|grupo|vagas|ats|canal|comunidade)\s*[:|-]\s*/gi, '');

  // 2. Remover sufixos societários e variações jurídicas comuns
  cleaned = cleaned
    .replace(/\b(ltda|s\.?a\.?|sa|me|epp|eireli|inc|llc|corp|gmbh|brasil|do brasil)\b/gi, ' ');

  // 3. Substituir caracteres não alfanuméricos por espaço
  cleaned = cleaned.replace(/[^a-z0-9]+/g, ' ').trim();

  return cleaned.split(/\s+/).filter(Boolean).join('-');
}

/**
 * Mapeamento rápido de nomes por extenso para siglas de estados (UF)
 */
const STATE_NAMES_TO_UF: Record<string, string> = {
  'santa catarina': 'sc',
  'sao paulo': 'sp',
  'rio de janeiro': 'rj',
  'parana': 'pr',
  'rio grande do sul': 'rs',
  'minas gerais': 'mg',
  'bahia': 'ba',
  'distrito federal': 'df',
  'goias': 'go',
  'espirito santo': 'es',
  'pernambuco': 'pe',
  'ceara': 'ce',
};

/**
 * Gera slug normalizado de localização geográfica ou remota.
 */
export function slugifyLocation(location?: string | null): string {
  if (!location) return 'remoto';

  let cleaned = cleanText(location);

  // Se indicar trabalho remoto / home office / qualquer local
  if (
    /\b(remoto|home\s*office|anywhere|teletrabalho|a\s*distancia|100%\s*remoto|virtual)\b/i.test(cleaned)
  ) {
    return 'remoto';
  }

  // Substituir nomes de estado por extenso pela sigla
  for (const [stateName, uf] of Object.entries(STATE_NAMES_TO_UF)) {
    const regex = new RegExp(`\\b${stateName}\\b`, 'gi');
    cleaned = cleaned.replace(regex, uf);
  }

  // Normalizar separadores entre Cidade e Estado (ex: "Florianópolis - SC" ou "Florianópolis, SC")
  cleaned = cleaned.replace(/[^a-z0-9]+/g, ' ').trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'remoto';

  return parts.join('-');
}

export interface JobFingerprintDetails {
  slugTitle: string;
  slugCompany: string;
  slugLocation: string;
  canonicalString: string;
  fingerprint: string;
}

/**
 * Retorna os detalhes da composição do fingerprint (slugs e string canônica).
 */
export function getJobFingerprintDetails(
  title: string,
  company: string,
  location?: string | null
): JobFingerprintDetails {
  const slugTitle = slugifyTitle(title);
  const slugCompany = slugifyCompany(company);
  const slugLocation = slugifyLocation(location);

  const canonicalString = `${slugTitle}|${slugCompany}|${slugLocation}`;
  const fingerprint = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return {
    slugTitle,
    slugCompany,
    slugLocation,
    canonicalString,
    fingerprint,
  };
}

/**
 * Gera o fingerprint único e determinístico para uma vaga.
 * Baseado na combinação canônica: hash(slug(titulo) + '|' + slug(empresa) + '|' + slug(cidade_uf))
 */
export function generateJobFingerprint(
  title: string,
  company: string,
  location?: string | null
): string {
  return getJobFingerprintDetails(title, company, location).fingerprint;
}
