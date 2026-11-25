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
  // 3. Funções comerciais / vendas com nomenclatura "Desenvolvedor de Vendas / Negócios" ou "Seller Dev"
  {
    pattern: /\b(desenvolvedor[a]?\s+de\s+(vendas|neg[oó]cios)|seller\s+dev)\b/i,
    name: 'Hard Exclusion (Vendas / Comercial — Seller Dev)',
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
    pattern: /\b(vendas?|vendedor[a]?|consultor[a]?\s+(comercial|de\s+vendas)|executiv[oa]\s+de\s+(vendas|contas)|corretor[a]?\s+(de\s+im[oó]veis|de\s+seguros)|promotor[a]?\s+de\s+vendas|balconista|operador[a]?\s+de\s+caixa|caixa\b|inside\s+sales|sdr\b|bdr\b|comercial|business\s+developer|desenvolvedor[a]?\s+de\s+neg[oó]cios?)\b/i,
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
  // 11. Consultoria Funcional ERP/CRM e Sistemas sem Programação
  {
    pattern: /\b(consultor[a]?\s+sap|sap\s+(sd|mm|fi|pp|pm|qm|co|hcm|wm|b1|business\s+one|basis|funcional)|consultor[a]?\s+oracle(\s+ebs)?|consultor[a]?\s+salesforce|consultor[a]?\s+protheus|consultor[a]?\s+totvs|consultor[a]?\s+funcional|analista\s+funcional|analista\s+de\s+sustenta[cç][aã]o(\s+de\s+sistemas)?|sustenta[cç][aã]o\s+de\s+sistemas|implanta[cç][aã]o\s+de\s+sistemas|consultor[a]?\s+de\s+implanta[cç][aã]o)\b/i,
    name: 'Consultoria Funcional ERP/CRM (Não-Programação)',
  },
  // 12. Suporte Técnico, Help Desk, Service Desk e Atendimento de TI
  {
    pattern: /\b(suporte\s+t[eé]cnico|analista\s+de\s+suporte|t[eé]cnico\s+de\s+suporte|assistente\s+de\s+suporte|help\s*desk|service\s*desk|t[eé]cnico\s+de\s+inform[aá]tica|suporte\s+a\s+usu[aá]rios?|atendimento\s+de\s+ti|t[eé]cnico\s+de\s+campo|field\s+service|manuten[cç][aã]o\s+de\s+computadores|suporte\s+n[123]|suporte\s+n[ií]vel\s+[123]|auxiliar\s+de\s+ti|est[aá]gio\s+em\s+suporte|t[eé]cnico\s+de\s+ti|assistente\s+de\s+ti)\b/i,
    name: 'Suporte Técnico e Help Desk (Não-Programação)',
  },
  // 13. Infraestrutura Física, Redes, Hardware e Telecomunicações
  {
    pattern: /\b(analista\s+de\s+redes|administrador[a]?\s+de\s+redes|engenheir[oa]\s+de\s+redes|t[eé]cnico\s+de\s+redes|telecomunica[cç][oõ]es|telecom\b|fibra\s+[oó]ptica|cabeamento(\s+estruturado)?|cftv\b|infraestrutura\s+f[ií]sica|analista\s+de\s+infraestrutura\s+e\s+redes|t[eé]cnico\s+de\s+telecom|analista\s+de\s+telecom|analista\s+de\s+infraestrutura\b|t[eé]cnico\s+de\s+infraestrutura|infraestrutura\s+de\s+ti)\b/i,
    name: 'Infraestrutura Física e Redes (Não-Programação)',
  },
  // 14. Gestão Ágil, Produtos e Metodologias sem Código
  {
    pattern: /\b(product\s+owner|product\s+manager|group\s+product\s+manager|scrum\s+master|agilista|agile\s+coach|analista\s+de\s+neg[oó]cios?(\s+de\s+ti)?|business\s+analyst|gerente\s+de\s+projetos?(\s+de\s+ti)?|coordenador[a]?\s+de\s+ti|gerente\s+de\s+ti|diretor[a]?\s+de\s+ti|it\s+manager|head\s+de\s+ti|governan[cç]a\s+de\s+ti)\b/i,
    name: 'Gestão / Produtos / Ágil (Não-Programação)',
  },
  // 15. Design puro sem programação
  {
    pattern: /\b(ui\/ux\s+designer|ux\/ui\s+designer|ux\s+designer|ui\s+designer|product\s+designer|designer\s+de\s+produto|designer\s+gr[aá]fico|designer\s+visual|web\s+designer\b)\b/i,
    name: 'Design puro (Não-Programação)',
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
  'segurança patrimonial',
  'seguranca patrimonial',
  'vigilante patrimonial',
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
  // 1. Cargos centrais de programação e desenvolvimento
  /\b(desenvolvedor[a]?|developer|dev\b|programador[a]?|frontend|front-end|backend|back-end|fullstack|full-stack|full\s+stack|mobile\s+developer|web\s+developer)\b/iu,
  // 2. Engenharia e Arquitetura de Software / Sistemas / Soluções
  /\b(software\s+(development\s+)?engineer(ing)?|software\s+developer|engenheir[oa]\s+de\s+software|engenharia\s+de\s+software|arquiteto[a]?\s+de\s+(software|sistemas|solu[cç][oõ]es)|solutions?\s+architect|solutions?\s+engineer)\b/iu,
  // 3. Análise e desenvolvimento de sistemas
  /\b(analista\s+desenvolvedor[a]?|analista\s+programador[a]?|desenvolvimento\s+de\s+(sistemas?|software|aplica[cç][oõ]es|apps?|web))\b/iu,
  // 4. Engenharia de Dados, Ciência de Dados e IA/ML (programação de dados e algoritmos)
  /\b(data\s+(engineer|scientist|architect)|engenheir[oa]\s+de\s+dados|cientista\s+de\s+dados|machine\s+learning\s+engineer|engenheir[oa]\s+de\s+(ia|ai|intelig[eê]ncia\s+artificial)|ai\s+engineer|ml\s+engineer|nlp\s+engineer)\b/iu,
  // 5. DevOps, SRE, Cloud e Infraestrutura como Código (IaC / automação)
  /\b(devops(\s+engineer)?|sre\b|site\s+reliability\s+engineer|cloud\s+engineer|engenheir[oa]\s+de\s+(cloud|nuvem)|platform\s+engineer|devsecops)\b/iu,
  // 6. QA e Automação de Testes de Software
  /\b(qa(\s+(engineer|analyst|tester))?|engenheir[oa]\s+de\s+qa|analista\s+de\s+qa|analista\s+de\s+testes|quality\s+assurance(\s+engineer)?|sdet\b|analista\s+de\s+automa[cç][aã]o(\s+de\s+testes)?|automa[cç][aã]o\s+de\s+testes)\b/iu,
  // 7. Liderança técnica de engenharia de software
  /\b(tech\s+lead|l[ií]der\s+t[eé]cnic[oa](\s+de\s+software|\s+de\s+desenvolvimento)?|staff\s+engineer|principal\s+engineer)\b/iu,
];

export const TECH_WHITELIST_PATTERNS: RegExp[] = [
  ...EXPLICIT_SOFTWARE_PATTERNS,
  // Mobile / Plataformas específicas
  /\b(mobile|android|ios|swift|swiftui|kotlin|flutter|react\s+native)(\s*(developer|dev|desenvolvedor[a]?|engineer))?\b/iu,
  // Stacks web/backend específicas combinadas com developer/desenvolvedor/engenheiro
  /\b(react|angular|vue|next\.?js|nuxt|node\.?js|nest\.?js|django|fastapi|flask|spring\s+boot|laravel|asp\.?net|\.net\s+core)\s+(developer|dev|desenvolvedor[a]?|engineer)\b/iu,
  /\b(python|java|c#|golang|go\s+lang|rust|php|ruby|typescript|javascript|c\+\+|abap|apex)\s+(developer|dev|desenvolvedor[a]?|engineer|programador[a]?)\b/iu,
  // Sistemas Embarcados / IoT / Firmware
  /\b(desenvolvedor[a]?|engenheir[oa])\s+(de\s+)?(firmware|embarcados?|iot|sistemas\s+embarcados?)\b/iu,
  // Vagas com título de stack puro comum (ex: "FullStack Dotnet Core e Angular/React", "Senior Swift & SwiftUI Developer")
  /\b(fullstack|full-stack|full\s+stack|frontend|backend)\s+([\p{L}\d\s/+#.-]+\s+)?(developer|dev|desenvolvedor[a]?|engineer|programador[a]?|core|react|angular|vue|node|dotnet|\.net)\b/iu,
  // Análise de Sistemas e Dados/Segurança aplicados
  /\b(analista\s+([\p{L}\s]+\s+)?de\s+(sistemas|dados|bi|seguran[cç]a\s+da\s+informa[cç][aã]o)|analista\s+desenvolvedor[a]?|analista\s+programador[a]?|data\s+analyst|cybersec|appsec)\b/iu,
  // Vagas freelance / projetos com escopo de desenvolvimento de software
  /\b(desenvolvimento|cria[cç][aã]o|ajustes?|integra[cç][aã]o)\s+(de\s+|em\s+)?(software|sistema|api|webhook|bot|script|aplicativo|app|website|site|landing\s+page)\b/iu,
];

export const TECH_WHITELIST: string[] = [
  'desenvolvedor',
  'developer',
  'programador',
  'software engineer',
  'engenheiro de software',
  'engenheiro de dados',
  'engenheiro de devops',
  'engenheiro de qa',
  'engenheiro de cloud',
  'data engineer',
  'data scientist',
  'cientista de dados',
  'devops engineer',
  'cloud engineer',
  'qa engineer',
  'machine learning engineer',
  'frontend',
  'backend',
  'fullstack',
  'full stack',
  'mobile developer',
  'desenvolvedor web',
  'web developer',
  'desenvolvedor mobile',
  'desenvolvedor frontend',
  'desenvolvedor backend',
  'desenvolvedor full stack',
  'desenvolvedor software',
  'programador de software',
  'analista desenvolvedor',
  'analista programador',
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

  // 2. Verifica se possui cargo explícito de desenvolvimento/programação de software
  const hasPureDevRole = /\b(desenvolvedor[a]?|developer|dev\b|programador[a]?|desenvolvimento(\s+de\s+(software|sistemas?|aplica[cç][oõ]es|apps?|web))?|software\s+engineer|engenheir[oa]\s+de\s+software|engenharia\s+de\s+software|software\s+developer|fullstack|full-stack|full\s+stack|frontend|front-end|backend|back-end|abap|apex|sdet|qa\b|analista\s+de\s+qa|data\s+(engineer|scientist)|engenheir[oa]\s+de\s+dados|cientista\s+de\s+dados|devops|sre|cloud\s+engineer|analista\s+de\s+seguran[cç]a\s+da\s+informa[cç][aã]o|cybersec|appsec)\b/i.test(cleanTitle);

  // 3. Avalia os padrões estruturados de blacklist
  for (const item of TITLE_BLACKLIST_PATTERNS) {
    if (item.pattern.test(cleanTitle)) {
      // Se houver cargo explícito de software e o termo não-tech for apenas o contexto de negócio
      // (ex: 'Desenvolvedor Backend (Venda Direta)' ou 'Engenheiro de Software | Assistente e Júnior'),
      // concede precedência à função técnica de software.
      if (hasPureDevRole) {
        continue;
      }
      return { matched: true, term: item.name };
    }
  }

  // 4. Fallback para termos da blacklist clássica com word boundaries
  const lower = cleanTitle.toLowerCase();
  for (const term of TITLE_BLACKLIST) {
    if (hasPureDevRole) continue;
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

/**
 * Alias explícito para garantir conformidade exclusiva com vagas de programação e engenharia de software.
 */
export const isProgrammingJob = isTechJob;
export const isProgrammingOrTechJob = isTechJob;

/**
 * Filtro rígido de fontes/plataformas bloqueadas (ex: fontes pagas como beBee).
 */
export function isBlacklistedSource(platform?: string, company?: string, url?: string): boolean {
  const p = (platform || '').toLowerCase();
  const c = (company || '').toLowerCase();
  const u = (url || '').toLowerCase();

  // beBee (fonte paga / desativada)
  if (p === 'bebee' || p.includes('bebee') || c.includes('bebee') || u.includes('bebee.com')) {
    return true;
  }

  return false;
}
