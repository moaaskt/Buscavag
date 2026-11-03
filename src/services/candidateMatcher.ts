import { ProcessedJob, RawJob } from '../types/job';

export interface CandidateContext {
  userId: string;
  targetRole?: string | null;
  seniority?: string | null;
  expectedSalary?: string | null;
  preferredWorkModels: string[];
  skills: string[]; // Combined skills from profile + resume
  bio?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface CandidateMatchResult {
  jobId: string;
  overallScore: number; // 0 a 100
  stackScore: number; // 0 a 100
  roleScore: number; // 0 a 100
  seniorityScore: number; // 0 a 100
  locationScore: number; // 0 a 100
  salaryScore: number; // 0 a 100
  matchedSkills: string[];
  missingSkills: string[];
  matchReasoning: string;
  isStrongMatch: boolean; // score >= 75
  isHardBlocked?: boolean;
  blockReason?: string;
}

export type CanonicalSeniority = 'estagio' | 'junior' | 'pleno' | 'senior' | 'unspecified';

export interface SeniorityDistanceEvaluation {
  candidateLevel: CanonicalSeniority;
  jobLevel: CanonicalSeniority;
  seniorityScore: number;
  maxScoreCap: number; // 35 (Hard Block), 60 (Moderado), 65 (Overqualification), 100 (Harmonia)
  isHardBlocked: boolean;
  reason: string;
}

/**
 * Normaliza e extrai faixas salariais em formato numérico.
 * Trata notação "k" (ex: "8k - 12k" -> [8000, 12000], "8.5k" -> [8500]),
 * além de formatos monetários nacionais (ex: "R$ 3.500,00" -> [3500]).
 */
export function parseSalary(salaryStr: string | null | undefined): { min: number; max: number } | null {
  if (!salaryStr || typeof salaryStr !== 'string') return null;
  const clean = salaryStr.toLowerCase().trim();
  if (
    !clean ||
    clean === 'a combinar' ||
    clean === 'não informado' ||
    clean === 'nao informado' ||
    clean === 'confidencial' ||
    clean === 'combinar'
  ) {
    return null;
  }

  // 1. Converte sufixo "k" com ou sem decimais (ex: 8k -> 8000, 8.5k -> 8500, 12k -> 12000)
  const expandedK = clean.replace(/(\d+(?:[.,]\d+)?)\s*k\b/gi, (_match, numStr) => {
    const normalizedNum = parseFloat(numStr.replace(',', '.'));
    return isNaN(normalizedNum) ? _match : String(Math.round(normalizedNum * 1000));
  });

  // 2. Extrai tokens numéricos
  const tokens = expandedK.match(/\b\d+(?:[.,]\d+)?\b/g);
  if (!tokens) return null;

  const numbers: number[] = [];
  for (const t of tokens) {
    let cleanNum = t;
    if (cleanNum.includes('.') && cleanNum.includes(',')) {
      cleanNum = cleanNum.replace(/\./g, '').replace(',', '.');
    } else if (cleanNum.includes('.')) {
      if (/\.\d{3}$/.test(cleanNum)) {
        cleanNum = cleanNum.replace(/\./g, '');
      }
    } else if (cleanNum.includes(',')) {
      if (/,\d{3}$/.test(cleanNum)) {
        cleanNum = cleanNum.replace(/,/g, '');
      } else {
        cleanNum = cleanNum.replace(',', '.');
      }
    }

    const val = parseFloat(cleanNum);
    // Filtro de sanidade: salários mensais entre R$ 500 e R$ 150.000
    if (!isNaN(val) && val >= 500 && val <= 150000) {
      numbers.push(Math.round(val));
    }
  }

  if (numbers.length === 0) return null;
  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0] };
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

/**
 * Normaliza nível de senioridade do candidato em nível canônico.
 */
export function normalizeCandidateSeniority(seniorityStr: string | null | undefined): CanonicalSeniority {
  if (!seniorityStr) return 'junior';
  const s = seniorityStr.toLowerCase().trim();
  if (/\b(est[áa]gio|estagi[áa]rio|intern(?:ship)?|trainee)\b/i.test(s)) return 'estagio';
  if (/\b(j[úu]nior|jr\.?|entry(?:-level)?|assistente|iniciante)\b/i.test(s)) return 'junior';
  if (/\b(pleno|pl\.?|mid(?:-level)?|intermedi[áa]rio)\b/i.test(s)) return 'pleno';
  if (/\b(s[êe]nior|sr\.?|especialista|tech\s*lead|lead|staff|principal|arquiteto|architect)\b/i.test(s)) return 'senior';
  return 'junior';
}

/**
 * Normaliza e identifica a senioridade requerida pela vaga a partir do título e descrição.
 * Prioriza o título para evitar falsos positivos de descrições genéricas.
 */
export function parseJobSeniority(jobTitle: string, jobDescription: string = ''): {
  level: CanonicalSeniority;
  isExplicit: boolean;
  hasSenior: boolean;
  hasPleno: boolean;
  hasJunior: boolean;
  hasEstagio: boolean;
} {
  const title = (jobTitle || '').toLowerCase();
  const desc = (jobDescription || '').toLowerCase();

  const seniorTitleRegex = /\b(s[êe]nior|sr\.?|senior|especialista|tech\s*lead|staff|principal|arquiteto|architect)\b/i;
  const plenoTitleRegex = /\b(pleno|pl\.?|mid(?:-level)?|intermedi[áa]rio)\b/i;
  const juniorTitleRegex = /\b(j[úu]nior|jr\.?|junior|entry(?:-level)?|assistente|iniciante)\b/i;
  const estagioTitleRegex = /\b(est[áa]gio|estagio|estagi[áa]rio|estagiario|intern(?:ship)?|trainee)\b/i;

  let hasSenior = seniorTitleRegex.test(title);
  let hasPleno = plenoTitleRegex.test(title);
  let hasJunior = juniorTitleRegex.test(title);
  let hasEstagio = estagioTitleRegex.test(title);

  const titleHasSeniority = hasSenior || hasPleno || hasJunior || hasEstagio;

  // Se não foi identificado no título, busca na descrição com padrões contextualizados
  if (!titleHasSeniority && desc) {
    hasSenior = /\b(s[êe]nior|sr\.?|senior|especialista|tech\s*lead|staff|principal|arquiteto)\b/i.test(desc);
    hasPleno = /\b(pleno|pl\.?|mid(?:-level)?|intermedi[áa]rio)\b/i.test(desc);
    hasJunior = /\b(j[úu]nior|jr\.?|junior|entry(?:-level)?|assistente|iniciante)\b/i.test(desc);
    hasEstagio = /\b(est[áa]gio|estagi[áa]rio|intern(?:ship)?|trainee)\b/i.test(desc);
  }

  const isExplicit = hasSenior || hasPleno || hasJunior || hasEstagio;

  let level: CanonicalSeniority = 'unspecified';
  if (hasSenior) level = 'senior';
  else if (hasPleno) level = 'pleno';
  else if (hasJunior) level = 'junior';
  else if (hasEstagio) level = 'estagio';

  return {
    level,
    isExplicit,
    hasSenior,
    hasPleno,
    hasJunior,
    hasEstagio,
  };
}

/**
 * Aplica a Matriz Granular de Distância de Senioridade com Cappings rígidos:
 * - Grave (Hard Block — Teto 35%): Estágio/Júnior -> Sênior / Tech Lead / Especialista.
 * - Moderado (Soft Penalty — Teto 60%): Júnior -> Pleno; Pleno -> Sênior.
 * - Overqualification (Teto 65%): Sênior -> Júnior / Estágio.
 * - Harmonia Perfeita (Sem Penalização — Teto 100%): Júnior -> Júnior/Assistente; Pleno -> Pleno; Sênior -> Sênior.
 * - Vaga Aberta / Sem nível: SeniorityScore saudável (85-90), teto 100%.
 */
export function evaluateSeniorityDistance(
  candidateSeniorityStr: string | null | undefined,
  jobTitle: string,
  jobDescription: string = ''
): SeniorityDistanceEvaluation {
  const candidateLevel = normalizeCandidateSeniority(candidateSeniorityStr);
  const jobInfo = parseJobSeniority(jobTitle, jobDescription);

  if (!jobInfo.isExplicit) {
    return {
      candidateLevel,
      jobLevel: 'unspecified',
      seniorityScore: candidateLevel === 'junior' ? 85 : 90,
      maxScoreCap: 100,
      isHardBlocked: false,
      reason: 'Vaga aberta/sem nível de senioridade especificado',
    };
  }

  // 1. Candidato Estágio ou Júnior
  if (candidateLevel === 'estagio' || candidateLevel === 'junior') {
    if (jobInfo.hasSenior) {
      return {
        candidateLevel,
        jobLevel: 'senior',
        seniorityScore: 10,
        maxScoreCap: 35, // Teto cravado em 35%
        isHardBlocked: true,
        reason: 'Hard Block: Incompatibilidade grave de senioridade (Júnior/Estágio ➔ Sênior/Lead, teto 35%)',
      };
    }
    if (jobInfo.hasPleno) {
      return {
        candidateLevel,
        jobLevel: 'pleno',
        seniorityScore: 45,
        maxScoreCap: 60, // Soft Penalty: teto 60%
        isHardBlocked: false,
        reason: 'Divergência Moderada: Candidato Júnior para vaga Pleno (teto 60%)',
      };
    }
    if (jobInfo.hasJunior || jobInfo.hasEstagio) {
      return {
        candidateLevel,
        jobLevel: jobInfo.hasJunior ? 'junior' : 'estagio',
        seniorityScore: 100,
        maxScoreCap: 100,
        isHardBlocked: false,
        reason: 'Harmonia Perfeita de Senioridade (Júnior/Estágio)',
      };
    }
  }

  // 2. Candidato Pleno
  if (candidateLevel === 'pleno') {
    if (jobInfo.hasSenior) {
      return {
        candidateLevel,
        jobLevel: 'senior',
        seniorityScore: 50,
        maxScoreCap: 60, // Soft Penalty: teto 60%
        isHardBlocked: false,
        reason: 'Divergência Moderada: Candidato Pleno para vaga Sênior/Lead (teto 60%)',
      };
    }
    if (jobInfo.hasPleno) {
      return {
        candidateLevel,
        jobLevel: 'pleno',
        seniorityScore: 100,
        maxScoreCap: 100,
        isHardBlocked: false,
        reason: 'Harmonia Perfeita de Senioridade (Pleno)',
      };
    }
    if (jobInfo.hasJunior || jobInfo.hasEstagio) {
      return {
        candidateLevel,
        jobLevel: 'junior',
        seniorityScore: 70,
        maxScoreCap: 75,
        isHardBlocked: false,
        reason: 'Candidato Pleno para vaga Júnior (leve descompasso)',
      };
    }
  }

  // 3. Candidato Sênior
  if (candidateLevel === 'senior') {
    if (jobInfo.hasSenior) {
      return {
        candidateLevel,
        jobLevel: 'senior',
        seniorityScore: 100,
        maxScoreCap: 100,
        isHardBlocked: false,
        reason: 'Harmonia Perfeita de Senioridade (Sênior/Lead)',
      };
    }
    if (jobInfo.hasPleno) {
      return {
        candidateLevel,
        jobLevel: 'pleno',
        seniorityScore: 80,
        maxScoreCap: 85,
        isHardBlocked: false,
        reason: 'Candidato Sênior para vaga Pleno (compatível)',
      };
    }
    if (jobInfo.hasJunior || jobInfo.hasEstagio) {
      return {
        candidateLevel,
        jobLevel: 'junior',
        seniorityScore: 40,
        maxScoreCap: 65, // Overqualification: teto 65%
        isHardBlocked: false,
        reason: 'Overqualification: Candidato Sênior para vaga Júnior/Estágio (teto 65%)',
      };
    }
  }

  return {
    candidateLevel,
    jobLevel: jobInfo.level,
    seniorityScore: 80,
    maxScoreCap: 100,
    isHardBlocked: false,
    reason: 'Compatibilidade padrão de senioridade',
  };
}

export interface GeoCompatibilityResult {
  locationScore: number;
  locationCap: number;
  isGeoHardBlocked: boolean;
  geoReason: string;
}

/**
 * Normaliza string para comparação geográfica: minusculas, sem acentos, sem pontuação extra.
 */
function normalizeGeo(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-z0-9\s]/g, ' ')    // substitui pontuação por espaço
    .replace(/\s+/g, ' ')
    .trim();
}

const BRAZILIAN_UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
] as const;

/**
 * Avalia compatibilidade geográfica entre candidato e vaga.
 *
 * Regras:
 * - Vaga remota ou candidato sem cidade → neutro (sem cap‐geográfico).
 * - Vaga presencial com localização não informada/omitida → neutro (score 70, sem teto).
 * - Vaga presencial/híbrida + candidato COM cidade:
 *   • Mesma cidade (mesmo sem UF explícita, se não conflitante) → score 100, sem teto.
 *   • Mesmo estado, cidade diferente → score 55, teto 70.
 *   • Estado diferente → score 15, teto 35 (Hard Block).
 */
export function evaluateGeographicCompatibility(
  candidateCity: string | null | undefined,
  candidateState: string | null | undefined,
  jobLocation: string | null | undefined,
  jobWorkModel: string | null | undefined,
  candidatePreferredModels: string[],
  jobTitle?: string | null // I-02: incluso para detectar "Desenvolvedor Remoto" no título
): GeoCompatibilityResult {
  const jobLoc = (jobLocation || '').toLowerCase();
  const workModel = (jobWorkModel || '').toLowerCase();
  const jobTitleLower = (jobTitle || '').toLowerCase();

  // 1. Vaga remota → sem impacto geográfico (preserva comportamento anterior)
  // I-02: verifica jobTitle além de location e workModel
  const isRemote =
    /remoto|remote|home office|teletrabalho|qualquer lugar|anywhere|brasil/i.test(jobLoc) ||
    /remoto|remote|home office/i.test(workModel) ||
    /remoto|remote|home office/i.test(jobTitleLower);

  if (isRemote) {
    const prefersRemote = candidatePreferredModels.some((m) => /remoto/i.test(m));
    return {
      locationScore: prefersRemote ? 100 : 60,
      locationCap: 100,
      isGeoHardBlocked: false,
      geoReason: 'Vaga remota: sem restrição geográfica',
    };
  }

  // 2. Vaga presencial/híbrida: verifica preferência do candidato
  const prefersHybrid = candidatePreferredModels.some((m) => /h[ií]brido/i.test(m));
  const prefersPresential = candidatePreferredModels.some((m) => /presencial/i.test(m));
  const acceptsOnsite = prefersHybrid || prefersPresential;

  // 2a. Candidato prefere APENAS remoto: Hard Block legado
  if (!acceptsOnsite) {
    return {
      locationScore: 20,
      locationCap: 35,
      isGeoHardBlocked: true,
      geoReason: 'Hard Block: Vaga presencial incompatível com preferência exclusiva por trabalho remoto (teto 35%)',
    };
  }

  // 2b. Vaga presencial/híbrida sem localização especificada ou omitida: neutro (REQ-01 / W-01.2)
  const isJobLocMissing =
    !jobLocation ||
    jobLocation.trim().length === 0 ||
    /^(n[aã]o informad[oa]?|a combinar|indefinid[oa]?|a definir)$/i.test(jobLocation.trim());

  if (isJobLocMissing) {
    return {
      locationScore: 70,
      locationCap: 100,
      isGeoHardBlocked: false,
      geoReason: 'Vaga presencial com localização não informada: pontuação neutra (sem penalização)',
    };
  }

  // 2c. Candidato aceita presencial/híbrido mas não tem cidade cadastrada: neutro
  const hasCity = Boolean(candidateCity && candidateCity.trim().length > 0);
  const hasState = Boolean(candidateState && candidateState.trim().length > 0);

  if (!hasCity && !hasState) {
    return {
      locationScore: 70,
      locationCap: 100,
      isGeoHardBlocked: false,
      geoReason: 'Candidato sem cidade cadastrada: score neutro (sem penalização)',
    };
  }

  // 2d. Candidato TEM cidade/estado: comparar com a vaga
  const normJobLoc = normalizeGeo(jobLoc);
  const normCandCity = candidateCity ? normalizeGeo(candidateCity) : '';
  const normCandState = candidateState ? normalizeGeo(candidateState) : '';
  // UF em upper para busca na string (ex: "SC", "SP")
  const candStateUpper = (candidateState || '').toUpperCase().trim();
  const jobLocUpper = (jobLocation || '').toUpperCase();

  // Checa se estado do candidato aparece na string da vaga
  const stateInJob =
    (candStateUpper.length === 2 && new RegExp(`\\b${candStateUpper}\\b`).test(jobLocUpper)) ||
    (normCandState.length > 2 && normJobLoc.includes(normCandState));

  // Match de palavra inteira da cidade do candidato na localização da vaga
  const cityWordMatch = normCandCity.length > 0 && (() => {
    const escaped = normCandCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(normJobLoc);
  })();

  // Previne colisão semântica de prefixo: ex: candidato em "Rio" (RJ) vs vaga em "Rio Grande do Sul" / "Rio Grande do Norte"
  const isPrefixCollision =
    normCandCity === 'rio' && /\brio\s+grande\s+do\b/i.test(normJobLoc);

  // Checa se a vaga cita explicitamente OUTRA UF brasileira diferente do candidato
  const hasConflictingUf =
    candStateUpper.length === 2 &&
    BRAZILIAN_UFS.some((uf) => uf !== candStateUpper && new RegExp(`\\b${uf}\\b`).test(jobLocUpper));

  // W-01.1 / REQ-02: Cidade da vaga bate quando:
  // 1. A cidade do candidato bate por palavra inteira e não colide com prefixo de estado;
  // 2. E ou o estado do candidato bate, ou a vaga não cita nenhum estado conflitante (ex: vaga só diz "Florianópolis" ou "Curitiba").
  const cityInJob = cityWordMatch && !isPrefixCollision && (stateInJob || !hasConflictingUf);

  if (cityInJob) {
    // Mesma cidade → score perfeito
    return {
      locationScore: 100,
      locationCap: 100,
      isGeoHardBlocked: false,
      geoReason: `Harmonia geográfica: vaga na mesma cidade (${candidateCity})`,
    };
  }

  if (stateInJob) {
    // Mesmo estado, cidade diferente → soft penalty
    return {
      locationScore: 55,
      locationCap: 70,
      isGeoHardBlocked: false,
      geoReason: `Compatibilidade parcial: mesmo estado (${candidateState}), cidades distintas (teto 70%)`,
    };
  }

  // Estado diferente → Hard Block geográfico
  return {
    locationScore: 15,
    locationCap: 35,
    isGeoHardBlocked: true,
    geoReason: `Hard Block Geográfico: vaga presencial em estado diferente do candidato (${candidateState || '?'}) — teto 35%`,
  };
}

export interface RankedJobResult {
  job: ProcessedJob | (RawJob & { id: string; overall_score?: number; score_ia?: number });
  match: CandidateMatchResult;
}

export interface MatchFilterOptions {
  minScore?: number;
  search?: string;
  workModel?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}

// Mapeamento de sinônimos e aliases técnicos para normalização precisa
export const TECH_SYNONYMS: Record<string, string[]> = {
  'typescript': ['typescript', 'ts'],
  'javascript': ['javascript', 'js', 'ecmascript'],
  'react': ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs', 'next'],
  'node.js': ['node.js', 'nodejs', 'node'],
  'nestjs': ['nestjs', 'nest.js', 'nest'],
  'express': ['express', 'express.js', 'expressjs'],
  'python': ['python', 'py'],
  'fastapi': ['fastapi', 'fast-api'],
  'django': ['django'],
  'flask': ['flask'],
  'php': ['php'],
  'laravel': ['laravel'],
  'golang': ['golang', 'go lang', '\\bgo\\b'],
  'java': ['java', 'jvm'],
  'spring boot': ['spring boot', 'springboot', 'spring framework', 'spring'],
  'c#': ['c#', 'csharp', '.net', 'dotnet'],
  'c++': ['c\\+\\+', 'cpp'],
  'ruby': ['ruby', 'ruby on rails', 'rails'],
  'vue.js': ['vue', 'vue.js', 'vuejs'],
  'angular': ['angular', 'angularjs', 'angular.js'],
  'tailwind css': ['tailwind', 'tailwind css', 'tailwindcss'],
  'bootstrap': ['bootstrap'],
  'css': ['css', 'css3'],
  'html': ['html', 'html5'],
  'postgresql': ['postgres', 'postgresql', 'pgsql'],
  'mysql': ['mysql'],
  'mongodb': ['mongodb', 'mongo'],
  'sqlite': ['sqlite', 'sqlite3'],
  'redis': ['redis'],
  'supabase': ['supabase'],
  'firebase': ['firebase', 'firestore'],
  'docker': ['docker', 'container', 'containers'],
  'kubernetes': ['kubernetes', 'k8s'],
  'aws': ['aws', 'amazon web services'],
  'google cloud': ['gcp', 'google cloud', 'google cloud platform'],
  'azure': ['azure', 'microsoft azure'],
  'ci/cd': ['ci/cd', 'ci / cd', 'continuous integration', 'github actions', 'gitlab ci'],
  'git': ['git', 'github', 'gitlab'],
  'linux': ['linux', 'unix', 'ubuntu', 'debian'],
  'graphql': ['graphql', 'graph-ql'],
  'rest apis': ['rest', 'rest api', 'rest apis', 'restful'],
  'websockets': ['websocket', 'websockets', 'socket.io', 'ws'],
  'esp32': ['esp32', 'esp-32', 'espressif'],
  'esp8266': ['esp8266', 'esp-8266'],
  'arduino': ['arduino'],
  'raspberry pi': ['raspberry pi', 'raspberry', 'rpi'],
  'mqtt': ['mqtt', 'mosquitto'],
  'iot': ['iot', 'internet das coisas', 'internet of things', 'embarcados', 'embedded'],
};

export const KNOWN_TECH_LIST = Object.keys(TECH_SYNONYMS);

export class CandidateMatcher {
  /**
   * Calcula o score de compatibilidade detalhado de uma vaga para o perfil do candidato.
   * Aplica distribuição estrita: Stack (30%), Role (20%), Seniority (20%), Location (20%), Salary (10%).
   * Se houver incompatibilidade grave de senioridade ou localidade, aplica Capping de 35%.
   */
  public calculateMatch(job: any, candidate: CandidateContext): CandidateMatchResult {
    const jobTitle = (job.title || '').toLowerCase();
    const jobDescription = (job.description || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    const fullJobText = `${jobTitle} ${jobDescription} ${jobLocation}`;

    // 1. Avaliação de Senioridade (20% do peso total) + Matriz de Distância & Capping
    const seniorityEvaluation = evaluateSeniorityDistance(
      candidate.seniority,
      job.required_seniority || job.requiredSeniority || job.title || '',
      job.description || ''
    );
    const seniorityScore = seniorityEvaluation.seniorityScore;
    const seniorityCap = seniorityEvaluation.maxScoreCap;
    const isHardBlockedSeniority = seniorityEvaluation.isHardBlocked;

    // 2. Cálculo de Aderência de Stack (30% do peso total)
    const candidateSkillsLower = (candidate.skills || []).map((s) => s.trim().toLowerCase());
    const matchedSkillsSet = new Set<string>();
    const missingSkillsSet = new Set<string>();

    // Aproveitar stacks pré-computadas na ingestão pelo Hermes se disponíveis
    let precomputedStacks: string[] = [];
    if (Array.isArray(job.techStack)) {
      precomputedStacks = job.techStack;
    } else if (Array.isArray(job.tech_stack)) {
      precomputedStacks = job.tech_stack;
    } else if (typeof job.tech_stack === 'string') {
      try {
        precomputedStacks = JSON.parse(job.tech_stack);
      } catch {
        precomputedStacks = [];
      }
    }

    for (const tech of precomputedStacks) {
      const techLower = tech.trim().toLowerCase();
      if (!techLower) continue;
      const candidateHasTech = candidateSkillsLower.some((cSkill) => cSkill.includes(techLower) || techLower.includes(cSkill));
      const formatted = tech.charAt(0).toUpperCase() + tech.slice(1);
      if (candidateHasTech) {
        matchedSkillsSet.add(formatted);
      } else {
        missingSkillsSet.add(formatted);
      }
    }

    for (const tech of KNOWN_TECH_LIST) {
      const patterns = TECH_SYNONYMS[tech] || [tech];
      const isTechInJob = patterns.some((pat) => {
        const regex = new RegExp(`(?<![a-zA-Z0-9_-])${pat}(?![a-zA-Z0-9_-])`, 'i');
        return regex.test(fullJobText);
      });

      if (isTechInJob) {
        const candidateHasTech = patterns.some((pat) =>
          candidateSkillsLower.some((cSkill) => cSkill.includes(pat) || pat.includes(cSkill))
        );

        const formattedTechName = tech.charAt(0).toUpperCase() + tech.slice(1);

        if (candidateHasTech) {
          matchedSkillsSet.add(formattedTechName);
        } else {
          missingSkillsSet.add(formattedTechName);
        }
      }
    }

    const matchedSkills = Array.from(matchedSkillsSet);
    const missingSkills = Array.from(missingSkillsSet);
    const totalJobSkills = matchedSkills.length + missingSkills.length;

    let stackScore = 70;
    if (totalJobSkills > 0) {
      const matchRatio = matchedSkills.length / totalJobSkills;
      stackScore = Math.min(100, Math.round(matchRatio * 85 + Math.min(matchedSkills.length * 3, 15)));
    } else if (candidateSkillsLower.length > 0) {
      let genericMatches = 0;
      for (const skill of candidateSkillsLower) {
        if (fullJobText.includes(skill)) {
          genericMatches++;
          matchedSkills.push(skill);
        }
      }
      const isSoftwareDevJob = /\b(dev|developer|desenvolvedor|programador|software|integra|full\s*stack|web)\b/i.test(jobTitle);
      stackScore = genericMatches > 0 ? 80 : (isSoftwareDevJob ? 70 : 50);
    }

    // 3. Cálculo de Alinhamento de Cargo e Título (20% do peso total)
    const targetRoleLower = (candidate.targetRole || 'Desenvolvedor Full Stack').toLowerCase();
    let roleScore = 60;

    const roleKeywords = targetRoleLower.split(/[\s,/]+/).filter((w) => w.length > 2);
    let matchedRoleWords = 0;

    for (const kw of roleKeywords) {
      if (jobTitle.includes(kw)) {
        matchedRoleWords++;
      }
    }

    if (roleKeywords.length > 0) {
      const roleRatio = matchedRoleWords / roleKeywords.length;
      roleScore = Math.round(roleRatio * 100);
    }

    if (jobTitle.includes('desenvolvedor') || jobTitle.includes('developer') || jobTitle.includes('software') || jobTitle.includes('engenheiro')) {
      roleScore = Math.max(roleScore, 75);
    }
    if ((targetRoleLower.includes('full stack') || targetRoleLower.includes('fullstack')) &&
        (jobTitle.includes('full stack') || jobTitle.includes('fullstack'))) {
      roleScore = 100;
    }
    if ((targetRoleLower.includes('frontend') || targetRoleLower.includes('front-end')) &&
        (jobTitle.includes('frontend') || jobTitle.includes('front-end'))) {
      roleScore = 100;
    }
    if ((targetRoleLower.includes('backend') || targetRoleLower.includes('back-end')) &&
        (jobTitle.includes('backend') || jobTitle.includes('back-end'))) {
      roleScore = 100;
    }
    if (targetRoleLower.includes('iot') && (jobTitle.includes('iot') || jobTitle.includes('hardware') || jobTitle.includes('embarcados'))) {
      roleScore = 100;
    }

    // 4. Avaliação Geográfica (20% do peso total) — via evaluateGeographicCompatibility()
    const preferredModels = Array.isArray(candidate.preferredWorkModels) && candidate.preferredWorkModels.length > 0
      ? candidate.preferredWorkModels
      : ['Remoto', 'Híbrido', 'Presencial'];

    const geoEval = evaluateGeographicCompatibility(
      candidate.city,
      candidate.state,
      job.location || '',
      job.work_model || job.workModel || '',
      preferredModels,
      job.title || '' // I-02: jobTitle para detectar "Desenvolvedor Remoto"
    );
    const locationScore = geoEval.locationScore;
    const locationCap = geoEval.locationCap;
    const isGeoHardBlocked = geoEval.isGeoHardBlocked;

    // 5. Cálculo de Pretensão Salarial (10% do peso total)
    const jobSalaryParsed = parseSalary(job.salary || (job.description ? job.description.match(/(?:r\$|sal[áa]rio:?)\s*[\d.,k\s-]+/i)?.[0] : null));
    const candSalaryParsed = parseSalary(candidate.expectedSalary);
    let salaryScore = 80; // Neutro se nenhum salário informado

    if (candSalaryParsed && jobSalaryParsed) {
      if (jobSalaryParsed.max >= candSalaryParsed.min) {
        salaryScore = 100; // Vaga atende ou supera a pretensão
      } else {
        const ratio = jobSalaryParsed.max / candSalaryParsed.min;
        if (ratio >= 0.85) {
          salaryScore = 75;
        } else if (ratio >= 0.70) {
          salaryScore = 45;
        } else {
          salaryScore = 20;
        }
      }
    } else if (!candSalaryParsed && !jobSalaryParsed) {
      salaryScore = 90;
    }

    // Fórmula Final Ponderada (0 a 100): 30% Stack, 20% Role, 20% Seniority, 20% Location, 10% Salary
    const calculatedScore = Math.round(
      stackScore * 0.30 +
      roleScore * 0.20 +
      seniorityScore * 0.20 +
      locationScore * 0.20 +
      salaryScore * 0.10
    );

    // Aplicação dos Tetos Estritos (Capping)
    let overallScore = calculatedScore;
    if (seniorityCap < 100) {
      overallScore = Math.min(overallScore, seniorityCap);
    }
    if (locationCap < 100) {
      overallScore = Math.min(overallScore, locationCap);
    }
    overallScore = Math.max(0, Math.min(100, overallScore));

    const isHardBlocked = isHardBlockedSeniority || isGeoHardBlocked;
    let blockReason: string | undefined;
    if (isHardBlockedSeniority) {
      blockReason = seniorityEvaluation.reason;
    } else if (isGeoHardBlocked) {
      blockReason = geoEval.geoReason;
    }

    // Geração de Justificativa da IA
    let matchReasoning = '';
    if (isHardBlocked) {
      matchReasoning = `Incompatível: ${blockReason}. Score cravado no teto eliminatório de ${overallScore}%.`;
    } else if (seniorityCap === 60) {
      matchReasoning = `Compatibilidade parcial: ${seniorityEvaluation.reason}. Dominando competências: ${matchedSkills.slice(0, 2).join(', ') || 'gerais'}.`;
    } else if (seniorityCap === 65) {
      matchReasoning = `Atenção: ${seniorityEvaluation.reason}. Vaga com complexidade abaixo do seu histórico sênior.`;
    } else if (overallScore >= 85) {
      matchReasoning = `Altíssima aderência! Você domina as principais competências (${matchedSkills.slice(0, 3).join(', ') || 'da vaga'}) e o perfil de trabalho e senioridade estão em total harmonia.`;
    } else if (overallScore >= 70) {
      matchReasoning = `Boa oportunidade! Forte compatibilidade em ${matchedSkills.slice(0, 2).join(', ') || 'sua stack'}. ${missingSkills.length > 0 ? `Requisito diferencial: ${missingSkills.slice(0, 2).join(', ')}.` : ''}`;
    } else if (overallScore >= 50) {
      matchReasoning = `Compatibilidade moderada. Há sinergia na área de atuação, com oportunidade de expandir conhecimentos em ${missingSkills.slice(0, 2).join(', ') || 'novas ferramentas'}.`;
    } else {
      matchReasoning = `Compatibilidade básica. Vaga voltada para requisitos específicos que divergem da sua stack primária ou modelo de trabalho.`;
    }

    return {
      jobId: job.id || '',
      overallScore,
      stackScore,
      roleScore,
      seniorityScore,
      locationScore,
      salaryScore,
      matchedSkills,
      missingSkills,
      matchReasoning,
      isStrongMatch: overallScore >= 75 && !isHardBlocked,
      isHardBlocked,
      blockReason,
    };
  }

  /**
   * Ranqueia uma lista de vagas com base no match do candidato e aplica filtros.
   */
  public rankJobs(jobs: any[], candidate: CandidateContext, options?: MatchFilterOptions): RankedJobResult[] {
    const minScore = options?.minScore ?? 0;
    const search = options?.search?.toLowerCase().trim();
    const workModel = options?.workModel?.toLowerCase().trim();
    const platform = options?.platform?.toLowerCase().trim();

    const results: RankedJobResult[] = [];

    for (const job of jobs) {
      // Filtros básicos prévios
      if (platform && (job.platform || '').toLowerCase() !== platform) {
        continue;
      }

      if (search) {
        const full = `${job.title || ''} ${job.company || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
        if (!full.includes(search)) {
          continue;
        }
      }

      if (workModel) {
        const loc = `${job.location || ''} ${job.title || ''}`.toLowerCase();
        if (workModel === 'remoto' && !loc.includes('remoto') && !loc.includes('remote') && !loc.includes('home office')) {
          continue;
        }
        if (workModel === 'presencial' && (loc.includes('remoto') || loc.includes('remote'))) {
          continue;
        }
      }

      const match = this.calculateMatch(job, candidate);

      if (match.overallScore >= minScore) {
        results.push({
          job,
          match,
        });
      }
    }

    // Ordena decrescente por score de compatibilidade geral
    results.sort((a, b) => b.match.overallScore - a.match.overallScore);

    // Paginação se informada
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return results.slice(offset, offset + limit);
  }
}
