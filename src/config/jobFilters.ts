/**
 * Regras e listas de filtragem para triagem de vagas de tecnologia.
 */

export const TITLE_BLACKLIST_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // 1. Cargos administrativos, fiscais, contábeis e de departamento pessoal
  {
    pattern: /\b(assistente|auxiliar)\s+(administrativ[oa]|fiscal|financeir[oa]|cont[aá]bil|de compras|de rh|de departamento pessoal|de dp|operacional|de cobran[cç]a|de cr[eé]dito|de vendas|comercial|de log[ií]stica|de loja|de estoque|de expedi[cç][aã]o|jur[ií]dic[oa])\b/i,
    name: 'Assistente/Auxiliar Não-Tech',
  },
  {
    pattern: /^(assistente|auxiliar)\s+(fiscal|administrativ[oa]|financeir[oa]|cont[aá]bil)/i,
    name: 'Assistente/Auxiliar Início de Título',
  },
  {
    pattern: /\b(corretor[a]?\s+(de im[oó]veis|de seguros)|vendedor[a]?|consultor[a]?\s+de vendas|telemarketing|atendente|recepcionista|operador[a]?\s+de caixa|balconista|promotor[a]?\s+de vendas|executiv[oa]\s+de vendas|consultor[a]?\s+comercial)/i,
    name: 'Vendas e Atendimento',
  },
  // 3. Saúde, medicina, enfermagem e estética
  {
    pattern: /\b(enfermeir[oa]|t[eé]cnic[oa]\s+em enfermagem|m[eé]dic[oa]|dentista|fisioterapeuta|farmac[eê]utic[oa]|psic[oó]log[oa]|nutricionista|esteticista|manicure|barbeiro|cuidador[a]?|biom[eé]dic[oa])\b/i,
    name: 'Saúde e Estética',
  },
  // 4. Operações manuais, segurança, limpeza e logística geral
  {
    pattern: /\b(pedreiro|motorista|vigilante|mec[aâ]nico|muscula[cç][aã]o|servi[cç]os gerais|cozinheir[oa]|porteir[oa]|faxineir[oa]|jardineir[oa]|zelador[a]?|gar[cç]om|gar[cç]onete|estoquista|almoxarife|operador[a]?\s+de empilhadeira)\b/i,
    name: 'Operações e Serviços Gerais',
  },
  // 5. Estágios não-tech
  {
    pattern: /\b(est[aá]gio|estagi[aá]ri[oa])\s+(em|de)?\s*(rh|recursos humanos|log[ií]stica|vendas|direito|pedagogia|enfermagem|administra[cç][aã]o|contabilidade|psicologia|marketing comercial)\b/i,
    name: 'Estágio Não-Tech',
  },
  // 6. Engenharias tradicionais não-software
  {
    pattern: /\b(engenheir[oa]\s+(eletricista|civil|mec[aâ]nic[oa]|cl[ií]nic[oa]|de produ[cç][aã]o|agr[oô]nom[oa]|qu[ií]mic[oa]|ambiental|sanitarista|florestal|de alimentos|de seguran[cç]a do trabalho))\b/i,
    name: 'Engenharia Não-Software',
  },
];

export const TITLE_BLACKLIST: string[] = [
  'pedreiro',
  'motorista',
  'vigilante',
  'mecânico',
  'mecanico',
  'musculação',
  'musculacao',
  'serviços gerais',
  'servicos gerais',
  'atendente',
  'vendedor',
  'fiscal de',
  'limpeza',
  'cozinheiro',
  'recepcionista',
  'porteiro',
  'balconista',
  'operador de',
  'auxiliar de limpeza',
  'faxineiro',
  'jardineiro',
  'zelador',
  'segurança',
  'seguranca',
  'garçom',
  'garcom',
  'esteticista',
  'manicure',
  'barbeiro',
  'cuidador',
  'diarista',
];

export const EXPLICIT_SOFTWARE_PATTERNS: RegExp[] = [
  /\b(desenvolvedor[a]?|developer|programador[a]?|devops|sre|frontend|front-end|backend|back-end|fullstack|full-stack|full\s+stack)\b/i,
  /\bengenheir[oa]\s+(de\s+)?(software|dados|sistemas|machine learning|ia|ai|computa[cç][aã]o|qa|testes|devops|cloud)\b/i,
  /\bsoftware\s+engineer\b/i,
  /\b(data engineer|data scientist|analista de dados|analista de bi|machine learning engineer)\b/i,
  /\b(arquiteto[a]?\s+de\s+(software|sistemas|solu[cç][oõ]es|dados|cloud))\b/i,
  /\bdesenvolvimento\s+de\s+(sistemas?|software|aplica[cç][oõ]es|apps?|web)\b/i,
];

export const TECH_WHITELIST: string[] = [
  'desenvolvedor',
  'developer',
  'programador',
  'software engineer',
  'engenheiro de software',
  'engenheiro de dados',
  'engenheiro de sistemas',
  'engenheiro de devops',
  'engenheiro de qa',
  'engenheiro de cloud',
  'data engineer',
  'devops engineer',
  'cloud engineer',
  'systems engineer',
  'qa engineer',
  'machine learning engineer',
  'frontend',
  'backend',
  'fullstack',
  'full stack',
  'mobile',
  'data',
  'dados',
  'software',
  'tech',
  'qa',
  'devops',
  'iot',
  'web',
  'analista de sistemas',
  'ti ',
  'ti/',
  'ti-',
  'tecnologia da informação',
  'tecnologia da informacao',
  'suporte técnico',
  'suporte tecnico',
  'infraestrutura',
];

/**
 * Verifica se um título contém algum termo ou padrão da blacklist.
 * Concede precedência a cargos explícitos de software para evitar falsos descartes em contextos híbridos.
 */
export function matchesBlacklist(title: string): { matched: boolean; term?: string } {
  if (!title) return { matched: false };
  const normalizedTitle = title.trim();

  // 1. Verifica se possui termo explícito de software
  const hasExplicitSoftware = EXPLICIT_SOFTWARE_PATTERNS.some((pattern) => pattern.test(normalizedTitle));

  // 2. Avalia os padrões estruturados de blacklist
  for (const item of TITLE_BLACKLIST_PATTERNS) {
    if (item.pattern.test(normalizedTitle)) {
      // Se houver termo explícito de software e o padrão for contextual secundário (Assistente, Vendas/Clientes ou Operações), mantém a precedência tech
      if (hasExplicitSoftware && (item.name.includes('Assistente') || item.name.includes('Vendas') || item.name.includes('Operações'))) {
        continue;
      }
      return { matched: true, term: item.name };
    }
  }

  // 3. Fallback para termos da blacklist clássica
  const lower = normalizedTitle.toLowerCase();
  for (const term of TITLE_BLACKLIST) {
    if (hasExplicitSoftware) continue;
    if (lower.includes(term.toLowerCase())) {
      return { matched: true, term };
    }
  }

  return { matched: false };
}

/**
 * Verifica se um título contém algum termo da whitelist técnica.
 */
export function matchesWhitelist(title: string): { matched: boolean; term?: string } {
  if (!title) return { matched: false };
  const normalizedTitle = title.toLowerCase();

  // Verifica padrões de software explícitos
  if (EXPLICIT_SOFTWARE_PATTERNS.some((pattern) => pattern.test(title))) {
    return { matched: true, term: 'software_explicit' };
  }

  for (const term of TECH_WHITELIST) {
    if (normalizedTitle.includes(term.toLowerCase())) {
      return { matched: true, term };
    }
  }
  return { matched: false };
}

/**
 * Verifica se um título de vaga é considerado técnico de acordo com a blacklist e whitelist.
 */
export function isTechJob(title: string): boolean {
  if (matchesBlacklist(title).matched) {
    return false;
  }
  return matchesWhitelist(title).matched;
}
