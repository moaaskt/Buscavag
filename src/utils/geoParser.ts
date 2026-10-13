/**
 * geoParser.ts - Normalizador Geográfico Canônico & Parser Estrito de UF
 * 
 * Implementação da Phase 93:
 * - Mapeamento estrito das 27 UFs do Brasil (siglas e nomes por extenso)
 * - Barreira contra falsos positivos (evita colisões com palavras comuns como 'javascript', 'fiscal', 'spring')
 * - Desambiguação de municípios homônimos (ex: São José em SC vs SP vs PR com base em conector e contexto)
 * - Dicionário canônico de polos catarinenses e nacionais
 * - Formatação canônica: "Cidade, UF", "Estado", "Remoto" ou "Remoto / Brasil"
 */

export interface CanonicalLocation {
  city?: string;
  state?: string;
  isRemote: boolean;
  canonicalLocation: string;
}

export const BRAZILIAN_UFS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

// Normalização simplificada de texto para buscas geográficas
export function cleanGeoText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Mapeamento normalizado de nomes de estado para siglas
const STATE_NORM_TO_UF: Record<string, string> = Object.entries(BRAZILIAN_UFS).reduce(
  (acc, [uf, name]) => {
    acc[cleanGeoText(name)] = uf;
    return acc;
  },
  {} as Record<string, string>
);

// Dicionário canônico de cidades de Santa Catarina (Polos e Municípios)
interface CityInfo {
  canonicalName: string;
  state: string;
}

const SC_CITIES_DICT: Record<string, CityInfo> = {
  'florianopolis': { canonicalName: 'Florianópolis', state: 'SC' },
  'floripa': { canonicalName: 'Florianópolis', state: 'SC' },
  'palhoca': { canonicalName: 'Palhoça', state: 'SC' },
  'biguacu': { canonicalName: 'Biguaçu', state: 'SC' },
  'joinville': { canonicalName: 'Joinville', state: 'SC' },
  'blumenau': { canonicalName: 'Blumenau', state: 'SC' },
  'itajaí': { canonicalName: 'Itajaí', state: 'SC' },
  'itajai': { canonicalName: 'Itajaí', state: 'SC' },
  'balneario camboriu': { canonicalName: 'Balneário Camboriú', state: 'SC' },
  'balneario camboriú': { canonicalName: 'Balneário Camboriú', state: 'SC' },
  'criciuma': { canonicalName: 'Criciúma', state: 'SC' },
  'chapeco': { canonicalName: 'Chapecó', state: 'SC' },
  'tubarao': { canonicalName: 'Tubarão', state: 'SC' },
  'brusque': { canonicalName: 'Brusque', state: 'SC' },
  'lages': { canonicalName: 'Lages', state: 'SC' },
  'jaragua do sul': { canonicalName: 'Jaraguá do Sul', state: 'SC' },
  'rio do sul': { canonicalName: 'Rio do Sul', state: 'SC' },
  'concordia': { canonicalName: 'Concórdia', state: 'SC' },
  'cacador': { canonicalName: 'Caçador', state: 'SC' },
  'gaspar': { canonicalName: 'Gaspar', state: 'SC' },
  'indaial': { canonicalName: 'Indaial', state: 'SC' },
  'sao bento do sul': { canonicalName: 'São Bento do Sul', state: 'SC' },
  'navegantes': { canonicalName: 'Navegantes', state: 'SC' },
  'camboriu': { canonicalName: 'Camboriú', state: 'SC' },
  'imbituba': { canonicalName: 'Imbituba', state: 'SC' },
  'laguna': { canonicalName: 'Laguna', state: 'SC' },
  'tijucas': { canonicalName: 'Tijucas', state: 'SC' },
};

// Dicionário canônico de capitais e principais polos nacionais
const NATIONAL_HUBS_DICT: Record<string, CityInfo> = {
  'sao paulo': { canonicalName: 'São Paulo', state: 'SP' },
  'sp': { canonicalName: 'São Paulo', state: 'SP' }, // quando usado como polo primário
  'campinas': { canonicalName: 'Campinas', state: 'SP' },
  'santos': { canonicalName: 'Santos', state: 'SP' },
  'sao bernardo do campo': { canonicalName: 'São Bernardo do Campo', state: 'SP' },
  'santo andre': { canonicalName: 'Santo André', state: 'SP' },
  'guarulhos': { canonicalName: 'Guarulhos', state: 'SP' },
  'osasco': { canonicalName: 'Osasco', state: 'SP' },
  'barueri': { canonicalName: 'Barueri', state: 'SP' },
  'alphaville': { canonicalName: 'Barueri', state: 'SP' },
  'sorocaba': { canonicalName: 'Sorocaba', state: 'SP' },
  'ribeirao preto': { canonicalName: 'Ribeirão Preto', state: 'SP' },
  'sao carlos': { canonicalName: 'São Carlos', state: 'SP' },
  'curitiba': { canonicalName: 'Curitiba', state: 'PR' },
  'londrina': { canonicalName: 'Londrina', state: 'PR' },
  'maringa': { canonicalName: 'Maringá', state: 'PR' },
  'porto alegre': { canonicalName: 'Porto Alegre', state: 'RS' },
  'poa': { canonicalName: 'Porto Alegre', state: 'RS' },
  'caxias do sul': { canonicalName: 'Caxias do Sul', state: 'RS' },
  'canoas': { canonicalName: 'Canoas', state: 'RS' },
  'belo horizonte': { canonicalName: 'Belo Horizonte', state: 'MG' },
  'bh': { canonicalName: 'Belo Horizonte', state: 'MG' },
  'uberlandia': { canonicalName: 'Uberlândia', state: 'MG' },
  'rio de janeiro': { canonicalName: 'Rio de Janeiro', state: 'RJ' },
  'rj': { canonicalName: 'Rio de Janeiro', state: 'RJ' },
  'niteroi': { canonicalName: 'Niterói', state: 'RJ' },
  'brasilia': { canonicalName: 'Brasília', state: 'DF' },
  'recife': { canonicalName: 'Recife', state: 'PE' },
  'salvador': { canonicalName: 'Salvador', state: 'BA' },
  'fortaleza': { canonicalName: 'Fortaleza', state: 'CE' },
  'goiania': { canonicalName: 'Goiânia', state: 'GO' },
  'vitoria': { canonicalName: 'Vitória', state: 'ES' },
  'vila velha': { canonicalName: 'Vila Velha', state: 'ES' },
  'manaus': { canonicalName: 'Manaus', state: 'AM' },
  'belem': { canonicalName: 'Belém', state: 'PA' },
  'natal': { canonicalName: 'Natal', state: 'RN' },
  'joao pessoa': { canonicalName: 'João Pessoa', state: 'PB' },
  'maceio': { canonicalName: 'Maceió', state: 'AL' },
  'aracaju': { canonicalName: 'Aracaju', state: 'SE' },
  'teresina': { canonicalName: 'Teresina', state: 'PI' },
  'sao luis': { canonicalName: 'São Luís', state: 'MA' },
  'campo grande': { canonicalName: 'Campo Grande', state: 'MS' },
  'cuiaba': { canonicalName: 'Cuiabá', state: 'MT' },
  'palmas': { canonicalName: 'Palmas', state: 'TO' },
  'porto velho': { canonicalName: 'Porto Velho', state: 'RO' },
  'rio branco': { canonicalName: 'Rio Branco', state: 'AC' },
  'macapa': { canonicalName: 'Macapá', state: 'AP' },
  'boa vista': { canonicalName: 'Boa Vista', state: 'RR' },
};

/**
 * Conectores regionais comprovadamente de Santa Catarina
 */
const SC_REGIONAL_PLATFORMS = new Set([
  'sao_jose',
  'vagas_floripa',
  'emprega_palhoca',
  'vagas_sc',
]);

/**
 * Extrai sigla estrita de UF com fronteira de palavra.
 * Garante que não haja falsos positivos com palavras da língua (ex: "javascript", "fiscal", "spring", "especialista").
 */
export function extractStateUF(text?: string | null): string | undefined {
  if (!text) return undefined;

  // 1. Busca por nome por extenso de estado brasileiro (ordenado do mais longo para o mais curto)
  const norm = cleanGeoText(text);
  const sortedStateEntries = Object.entries(STATE_NORM_TO_UF).sort((a, b) => b[0].length - a[0].length);
  for (const [stateNorm, uf] of sortedStateEntries) {
    // Regex de fronteira para nome completo do estado
    const stateRegex = new RegExp(`(^|[^a-z0-9])${stateNorm}([^a-z0-9]|$)`, 'i');
    if (stateRegex.test(norm)) {
      return uf;
    }
  }

  // 2. Busca estrita por siglas de 2 letras (ex: - SC, / SC, , SC ou \bSC\b isolado em maiúsculas ou cercado por delimitadores)
  // Verifica primeiro padrões delimitados explicitamente (ex: ", SC", " - SC", "/SC")
  const delimitedRegex = /(?:^|[\s,.\-\/|])([A-Z]{2})(?:[\s,.\-\/|]|$)/;
  const match = text.match(delimitedRegex);
  if (match && match[1]) {
    const candidate = match[1].toUpperCase();
    if (BRAZILIAN_UFS[candidate]) {
      return candidate;
    }
  }

  // Se o texto original contém a sigla com limites estritos de pontuação ou espaço em maiúsculas
  const allUFs = Object.keys(BRAZILIAN_UFS).join('|');
  const strictUfRegex = new RegExp(`\\b(${allUFs})\\b`);
  const strictMatch = text.match(strictUfRegex);
  if (strictMatch && strictMatch[1]) {
    return strictMatch[1];
  }

  return undefined;
}

/**
 * Resolve a desambiguação específica para "São José", que existe em SC, SP e PR.
 */
function resolveSaoJose(
  rawLocation: string,
  platform?: string,
  contextText: string = ''
): CityInfo {
  const normLocation = cleanGeoText(rawLocation);
  const normContext = cleanGeoText(contextText);
  const combined = `${normLocation} ${normContext}`;

  // Se houver indicação de São José dos Campos ou São José do Rio Preto (SP)
  if (combined.includes('campos') || combined.includes('rio preto') || combined.includes('sao paulo')) {
    if (combined.includes('rio preto')) {
      return { canonicalName: 'São José do Rio Preto', state: 'SP' };
    }
    return { canonicalName: 'São José dos Campos', state: 'SP' };
  }

  // Se houver indicação de São José dos Pinhais ou Paraná (PR)
  if (combined.includes('pinhais') || combined.includes('parana')) {
    return { canonicalName: 'São José dos Pinhais', state: 'PR' };
  }

  // Se o texto explicitamente cita SP ou PR
  const explicitUF = extractStateUF(rawLocation);
  if (explicitUF === 'SP') {
    return { canonicalName: 'São José dos Campos', state: 'SP' };
  }
  if (explicitUF === 'PR') {
    return { canonicalName: 'São José dos Pinhais', state: 'PR' };
  }

  // Se for conector regional de SC ou citar termos catarinenses
  if (
    (platform && SC_REGIONAL_PLATFORMS.has(platform)) ||
    combined.includes('santa catarina') ||
    combined.includes('sc') ||
    combined.includes('florianopolis') ||
    combined.includes('floripa') ||
    combined.includes('palhoca') ||
    combined.includes('biguacu') ||
    combined.includes('grande florianopolis')
  ) {
    return { canonicalName: 'São José', state: 'SC' };
  }

  // Default do BuscaVagas para "São José" isolado: São José (SC)
  return { canonicalName: 'São José', state: 'SC' };
}

/**
 * Função principal: Analisa uma localização e retorna a estrutura canônica enriquecida.
 */
export function parseCanonicalLocation(
  rawLocation?: string | null,
  platform?: string,
  title?: string,
  description?: string
): CanonicalLocation {
  const contextText = `${title || ''} ${description || ''}`;
  const cleanLoc = cleanGeoText(rawLocation);

  // 1. Identificar se é Remoto
  const isExplicitRemote =
    !cleanLoc ||
    cleanLoc === 'remoto' ||
    cleanLoc.includes('home office') ||
    cleanLoc.includes('teletrabalho') ||
    cleanLoc.includes('100% remoto') ||
    cleanLoc.includes('a distancia') ||
    cleanLoc.includes('anywhere') ||
    cleanLoc.includes('virtual');

  const mentionsBrasil = cleanLoc.includes('brasil') || cleanLoc.includes('brazil');

  // Se for puramente remoto sem nenhuma menção a cidade/estado
  if (isExplicitRemote && !cleanLoc.includes(',') && !cleanLoc.includes('-')) {
    // Se mencionar apenas Brasil ou estiver em branco
    if (mentionsBrasil || !cleanLoc) {
      return {
        isRemote: true,
        canonicalLocation: 'Remoto / Brasil',
      };
    }
    return {
      isRemote: true,
      canonicalLocation: 'Remoto',
    };
  }

  // 2. Extrair Estado (UF)
  let detectedUF = extractStateUF(rawLocation);

  // Se o conector for regional de SC e nenhuma outra UF tiver sido detectada
  if (!detectedUF && platform && SC_REGIONAL_PLATFORMS.has(platform)) {
    detectedUF = 'SC';
  }

  // 3. Caso especial de desambiguação: "São José"
  if (cleanLoc.includes('sao jose') || cleanLoc.includes('são josé')) {
    const saoJose = resolveSaoJose(rawLocation || '', platform, contextText);
    return {
      city: saoJose.canonicalName,
      state: saoJose.state,
      isRemote: isExplicitRemote,
      canonicalLocation: `${saoJose.canonicalName}, ${saoJose.state}`,
    };
  }

  // 4. Buscar correspondência em cidades de Santa Catarina
  for (const [key, cityInfo] of Object.entries(SC_CITIES_DICT)) {
    const cityRegex = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`, 'i');
    if (cityRegex.test(cleanLoc)) {
      const state = detectedUF || cityInfo.state;
      return {
        city: cityInfo.canonicalName,
        state,
        isRemote: isExplicitRemote,
        canonicalLocation: `${cityInfo.canonicalName}, ${state}`,
      };
    }
  }

  // 5. Buscar correspondência em capitais e polos nacionais
  for (const [key, cityInfo] of Object.entries(NATIONAL_HUBS_DICT)) {
    const hubRegex = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`, 'i');
    if (hubRegex.test(cleanLoc)) {
      const state = detectedUF || cityInfo.state;
      return {
        city: cityInfo.canonicalName,
        state,
        isRemote: isExplicitRemote,
        canonicalLocation: `${cityInfo.canonicalName}, ${state}`,
      };
    }
  }

  // 6. Caso tenha apenas o Estado (UF) detectado sem cidade específica
  if (detectedUF) {
    const stateName = BRAZILIAN_UFS[detectedUF];
    // Se a localização bruta for apenas a UF ou nome do estado
    if (
      cleanLoc === detectedUF.toLowerCase() ||
      cleanLoc === cleanGeoText(stateName) ||
      cleanLoc.includes(detectedUF.toLowerCase())
    ) {
      return {
        state: detectedUF,
        isRemote: isExplicitRemote,
        canonicalLocation: stateName,
      };
    }
  }

  // 7. Se for remoto com indicação de Brasil
  if (isExplicitRemote || mentionsBrasil) {
    return {
      isRemote: true,
      canonicalLocation: 'Remoto / Brasil',
    };
  }

  // 8. Fallback com preservação limpa de texto
  if (rawLocation && rawLocation.trim()) {
    const trimmed = rawLocation.trim();
    return {
      state: detectedUF,
      isRemote: false,
      canonicalLocation: detectedUF ? `${trimmed}, ${detectedUF}` : trimmed,
    };
  }

  return {
    isRemote: true,
    canonicalLocation: 'Remoto',
  };
}
