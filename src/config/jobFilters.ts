/**
 * Regras e listas de filtragem para triagem de vagas de tecnologia.
 */

/**
 * Remove sufixos comuns de botões/CTAs de sites de vagas (ex: "Candidatar-se", "Ver vaga")
 * e normaliza variações de gênero como "(a)", "(o)", "(a/o)" para facilitar o matching.
 */
export function cleanJobTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s*(candidatar(-se)?|candidate-se|ver vaga|inscreva-se|aplicar agora|apply now)\s*$/i, '')
    .replace(/(developer|desenvolvedor[a]?|dev|programador[a]?)(NOVA|NOVO)$/i, '$1')
    .replace(/\([aoe](\/[aoe])?\)/gi, '')
    .trim();
}

/**
 * Padrões de EXCLUSÃO DURA (Hard Exclusion).
 * Se o título contiver qualquer um desses termos, a vaga é sumariamente REJEITADA como não-TI,
 * SEM NENHUMA EXCEÇÃO (mesmo que contenha 'programador', 'desenvolvedor' ou 'analista').
 * Exemplo clássico: 'Programador CNC', 'Operador de Torno CNC', 'Programador CAM', etc.
 */
export const HARD_EXCLUSION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // 1. Manufatura, usinagem, torneamento, CNC e mecânica industrial pesada
  {
    pattern: /\b(cnc|torno|torneiro|usinagem|fresador[a]?|fresa\b|mandrilhador|caldeirari[ao]|caldeireir[oa]|soldador[a]?|marceneir[oa]|serralheir[oa]|centro\s+de\s+usinagem|cam\b|corte\s+(a\s+)?laser|prensa|dobradeira|injetora|injecao\s+plastica|eletromec[aâ]nic[oa])\b/i,
    name: 'Hard Exclusion (Manufatura / Usinagem / CNC)',
  },
  // 2. Montagem física de hardware, corte, inspeção fabril e instalações prediais
  {
    pattern: /\b(montagem\s+de\s+servidores|ajudante\s+de\s+torno|montador[a]?\s+de\s+pain[eé]is|eletricista\s+predial|esmerilhador|inspetor[a]?\s+da\s+qualidade|t[eé]cnico\s+de\s+inspe[cç][aã]o|t[eé]cnico\s+de\s+backup\s+operacional)\b/i,
    name: 'Hard Exclusion (Montagem Física / Fabril / Operacional)',
  },
];

export const TITLE_BLACKLIST_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // 1. Recursos Humanos, Recrutamento e Seleção, DP e Gestão de Pessoas
  {
    pattern: /\b(recrutamento(\s+e\s+sele[cç][aã]o)?|r&s|recrutador[a]?|tech\s+recruiter|talent\s+acquisition|headhunter|recursos\s+humanos|rh\b|departamento\s+pessoal|dp\b|gente\s+e\s+gest[aã]o|pessoas\s+e\s+cultura|auxiliar\s+de\s+pessoas|analista\s+de\s+pessoas|assistente\s+de\s+pessoas|gestor\s+de\s+recursos\s+humanos)\b/i,
    name: 'Recrutamento / RH / DP',
  },
  // 2. Logística, Estoque, Almoxarifado, Operações e Expedição
  {
    pattern: /\b(log[ií]stic[ao]|encarregad[oa]\s+log[ií]stic[oa]|operador[a]?\s+log[ií]stic[oa]|supervisor[a]?\s+de\s+log[ií]stica|analista\s+de\s+log[ií]stica|estoque|estoquista|almoxarife|almoxarifado|expedi[cç][aã]o|conferente|separador[a]?|embalador[a]?|repositor[a]?|operador[a]?\s+de\s+empilhadeira)\b/i,
    name: 'Logística e Estoque',
  },
  // 3. Fiscal, Contábil, Financeiro, Faturamento, Cobrança e Crédito
  {
    pattern: /\b(fiscal|departamento\s+fiscal|cont[aá]bil|contabilidade|financeir[oa]|faturamento|cobran[cç]a|cr[eé]dito|contas\s+a\s+(pagar|receber)|tesouraria|auditor[a]?\s+fiscal)\b/i,
    name: 'Fiscal / Contábil / Financeiro',
  },
  // 4. Administrativo geral, secretariado, recepção e atendimento operacional
  {
    pattern: /\b(administrativ[oa]|adminsitrativo|secret[aá]ri[ao]|recepcionista|recep[cç][aã]o|atendente|atendimento(\s+ao\s+cliente)?|sac\b|telemarketing|telefonista|jur[ií]dic[oa]|advogad[oa]|auxiliar\s+de\s+escrit[oó]rio|locutor[a]?\s+de\s+loja|host\s+corporativo)\b/i,
    name: 'Administrativo e Atendimento',
  },
  // 5. Vendas, comercial, varejo, promotor e corretores
  {
    pattern: /\b(vendas?|vendedor[a]?|consultor[a]?\s+(comercial|de\s+vendas)|executiv[oa]\s+de\s+(vendas|contas)|corretor[a]?\s+(de\s+im[oó]veis|de\s+seguros)|promotor[a]?\s+de\s+vendas|balconista|operador[a]?\s+de\s+caixa|caixa\b|inside\s+sales|sdr\b|bdr\b|comercial)\b/i,
    name: 'Vendas e Comercial',
  },
  // 6. Marketing tradicional não-tech, social media e copywriting
  {
    pattern: /\b(est[aá]gio\s+(em|de)\s+marketing|estagi[aá]ri[oa]\s+(em|de)\s+marketing|analista\s+de\s+marketing|social\s+media|copywriter|redator[a]?|assessor[a]?\s+de\s+imprensa|comunica[cç][aã]o\s+interna|publicidade\s+e\s+propaganda|edi[cç][aã]o\s+e\s+cria[cç][aã]o\s+de\s+v[ií]deos)\b/i,
    name: 'Marketing Não-Tech',
  },
  // 7. Saúde, medicina, enfermagem, estética e bem-estar
  {
    pattern: /\b(enfermeir[oa]|t[eé]cnic[oa]\s+em\s+enfermagem|m[eé]dic[oa]|dentista|fisioterapeuta|farmac[eê]utic[oa]|psic[oó]log[oa]|nutricionista|esteticista|manicure|barbeiro|cuidador[a]?|biom[eé]dic[oa])\b/i,
    name: 'Saúde e Estética',
  },
  // 8. Serviços gerais, limpeza, vigilância, transporte e alimentação
  {
    pattern: /\b(pedreiro|motorista|vigilante|muscula[cç][aã]o|servi[cç]os\s+gerais|cozinheir[oa]|porteir[oa]|faxineir[oa]|jardineir[oa]|zelador[a]?|gar[cç]om|gar[cç]onete|diarista|limpeza|copeir[oa]|auxiliar\s+de\s+cozinha|jovem\s+aprendiz\s*-\s*opera[cç][aã]o)\b/i,
    name: 'Serviços Gerais e Operacionais',
  },
  // 9. Estágios não-tech
  {
    pattern: /\b(est[aá]gio|estagi[aá]ri[oa])\s+(em|de)?\s*(rh|recursos\s+humanos|log[ií]stica|vendas|direito|pedagogia|enfermagem|administra[cç][aã]o|administrativ[oa]|contabilidade|cont[aá]bil|psicologia|marketing|ensino\s+m[eé]dio|suporte\s+ao\s+cliente)\b/i,
    name: 'Estágio Não-Tech',
  },
  // 10. Engenharias tradicionais não-software
  {
    pattern: /\b(engenheir[oa]\s+(eletricista|civil|mec[aâ]nic[oa]|cl[ií]nic[oa]|de\s+produ[cç][aã]o|agr[oô]nom[oa]|qu[ií]mic[oa]|ambiental|sanitarista|florestal|de\s+alimentos|de\s+seguran[cç]a\s+do\s+trabalho))\b/i,
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
  'cnc',
  'torno cnc',
  'torneiro mecânico',
  'torneiro mecanico',
  'usinagem',
  'recrutamento e seleção',
  'recursos humanos',
  'departamento pessoal',
];

export const EXPLICIT_SOFTWARE_PATTERNS: RegExp[] = [
  /\b(desenvolvedor[a]?|developer|dev\b|programador[a]?|frontend|front-end|backend|back-end|fullstack|full-stack|full\s+stack)\b/iu,
  /\b(engenheir[oa]|engenharia|analista|especialista|gerente|coordenador[a]?)\s+([\p{L}\s]+\s+)?(software|engenharia\s+de\s+software|dados|sistemas|desenvolvimento(\s+de\s+sistemas)?|machine\s*learning|ia\b|ai\b|computa[cç][aã]o|qa|testes|devops|cloud|infraestrutura|seguran[cç]a(\s+da\s+informa[cç][aã]o)?|cybersec|redes|sre|bi\b)\b/iu,
  /\b(software\s+(development\s+)?engineer(ing)?|software\s+developer|solutions?\s+engineer)\b/iu,
  /\b(data\s+(engineer|scientist|analyst|architect|science|analytics)|cientista\s+([\p{L}\s]+\s+)?de\s+dados|analista\s+([\p{L}\s]+\s+)?de\s+(dados|bi)|analista\s+de\s+banco\s+de\s+dados|administrador[a]?\s+de\s+dados|machine\s+learning\s+engineer)\b/iu,
  /\b(arquiteto[a]?\s+de\s+(software|sistemas|solu[cç][oõ]es|dados|cloud))\b/iu,
  /\b(desenvolvimento\s+de\s+(sistemas?|software|aplica[cç][oõ]es|apps?|web))\b/iu,
  /\b(devops|sre|site\s+reliability\s+engineer|cloud\s+engineer|engenheir[oa]\s+de\s+nuvem)\b/iu,
  /\b(tech\s+lead|l[ií]der\s+t[eé]cnic[oa]|staff\s+engineer|principal\s+engineer)\b/iu,
  /\b(qa\s+engineer|engenheir[oa]\s+de\s+qa|quality\s+assurance)\b/iu,
];

export const TECH_WHITELIST_PATTERNS: RegExp[] = [
  ...EXPLICIT_SOFTWARE_PATTERNS,
  /\b(mobile|android|ios|swift|kotlin|flutter|react\s+native)(\s*(developer|dev|desenvolvedor[a]?))?\b/iu,
  /\b(qa|tester|testador[a]?|analista\s+de\s+qa|analista\s+de\s+testes|automa[cç][aã]o\s+de\s+testes)\b/iu,
  /\b(iot|internet\s+das\s+coisas|sistemas?\s+embarcados?|desenvolvedor[a]?\s+embarcados?)\b/iu,
  /\b(analista\s+de\s+(sistemas|seguran[cç]a\s+da\s+informa[cç][aã]o|cybersec|redes|infraestrutura|dataviz))\b/iu,
  /\b(suporte\s+t[eé]cnico|analista\s+de\s+suporte|t[eé]cnico\s+de\s+suporte|assistente\s+de\s+ti|coordenador\s+de\s+ti|est[aá]gio\s+(em|de)\s+ti|t[eé]cnico\s+de\s+ti|gerente\s+de\s+ti|head\s+de\s+tecnologia|governan[cç]a\s+de\s+ti|engenharia\s+de\s+ti|it\s+manager)\b/iu,
  /\b(analista|t[eé]cnico|assistente|coordenador|gerente)\s+([\p{L}\s]+\s+)?ti\b/iu,
  /\b(infraestrutura\s+de\s+ti|administrador\s+de\s+redes|sysadmin)\b/iu,
  /\b(web\s+developer|desenvolvedor[a]?\s+web)\b/iu,
  /\b(dba|administrador\s+de\s+banco\s+de\s+dados)\b/iu,
  /\btecnologia\s+da\s+informa[cç][aã]o\b/iu,
  /\b(engenheir[oa]|desenvolvedor[a]?|especialista|consultor[a]?)\s+([\p{L}\s]+\s+)?(ia\b|ai\b|intelig[eê]ncia\s+artificial|automa[cç][aã]o|machine\s*learning|databricks|cloudera|big\s*data|sap|iam|grc|mlops|devsecops)\b/iu,
  /\b(mlops|devsecops|finops|dataops|big\s*data|databricks|cloudera)\b/iu,
  /\b(product\s+owner|product\s+manager|tech\s+manager|group\s+product\s+manager|ui\/ux|ux\/ui|product\s+designer)\b/iu,
  /\bgerente\s+de\s+projetos?\s+de\s+software\b/iu,
  /\b(cria[cç][aã]o|desenvolvimento|ajustes?)\s+(de\s+|em\s+)?(website|site|landing\s+page|wordpress|loja\s+virtual)\b/iu,
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
  'data scientist',
  'devops engineer',
  'cloud engineer',
  'systems engineer',
  'qa engineer',
  'machine learning engineer',
  'frontend',
  'backend',
  'fullstack',
  'full stack',
  'mobile developer',
  'desenvolvedor web',
  'analista de sistemas',
  'analista de dados',
  'analista de bi',
  'analista de ti',
  'suporte técnico',
  'infraestrutura de ti',
  'tecnologia da informação',
];

/**
 * Verifica se um título contém algum termo ou padrão da blacklist.
 * Regra: HARD EXCLUSIONS (CNC / Usinagem / Montagem Industrial) têm veto absoluto.
 * Se houver cargo explícito de software (ex: Desenvolvedor), preserva o cargo a menos que seja veto absoluto.
 */
export function matchesBlacklist(title: string): { matched: boolean; term?: string } {
  if (!title) return { matched: false };
  const cleanTitle = cleanJobTitle(title);
  if (!cleanTitle) return { matched: false };

  // 1. HARD EXCLUSION: Vetos absolutos (CNC, Usinagem, etc.)
  for (const item of HARD_EXCLUSION_PATTERNS) {
    if (item.pattern.test(cleanTitle)) {
      return { matched: true, term: item.name };
    }
  }

  // 2. Verifica se possui cargo explícito de software/engenharia
  const hasExplicitSoftware = EXPLICIT_SOFTWARE_PATTERNS.some((pattern) => pattern.test(cleanTitle));

  // 3. Avalia os padrões estruturados de blacklist
  for (const item of TITLE_BLACKLIST_PATTERNS) {
    if (item.pattern.test(cleanTitle)) {
      // Se houver cargo explícito de software e o termo não-tech for apenas o contexto/área de negócio
      // (ex: 'Desenvolvedor Backend (Venda Direta)' ou 'Engenheiro de Software | Assistente e Júnior'),
      // concede precedência à função técnica de software.
      if (hasExplicitSoftware) {
        continue;
      }
      return { matched: true, term: item.name };
    }
  }

  // 4. Fallback para termos da blacklist clássica com word boundaries
  const lower = cleanTitle.toLowerCase();
  for (const term of TITLE_BLACKLIST) {
    if (hasExplicitSoftware) continue;
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) {
      return { matched: true, term };
    }
  }

  return { matched: false };
}

/**
 * Verifica se um título contém algum termo da whitelist técnica com proteção de boundary.
 */
export function matchesWhitelist(title: string): { matched: boolean; term?: string } {
  if (!title) return { matched: false };
  const cleanTitle = cleanJobTitle(title);
  if (!cleanTitle) return { matched: false };

  // 1. Verifica padrões técnicos com word boundary
  for (const pattern of TECH_WHITELIST_PATTERNS) {
    if (pattern.test(cleanTitle)) {
      return { matched: true, term: pattern.source };
    }
  }

  // 2. Fallback compatível para termos da lista de strings
  const lower = cleanTitle.toLowerCase();
  for (const term of TECH_WHITELIST) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) {
      return { matched: true, term };
    }
  }

  return { matched: false };
}

/**
 * Verifica se um título de vaga é estritamente técnico de tecnologia/software.
 */
export function isTechJob(title: string): boolean {
  if (matchesBlacklist(title).matched) {
    return false;
  }
  return matchesWhitelist(title).matched;
}
