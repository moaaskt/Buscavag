import { NextRequest } from 'next/server';

/**
 * Validação estrita de origem (CSRF Protection) para endpoints de mutação do Workspace.
 *
 * Regras implementadas:
 * 1. Bloqueio de Sec-Fetch-Site 'cross-site' ou 'none'.
 * 2. Exigência de comparação exata de origem normalizada (scheme://hostname:port).
 * 3. HTTPS obrigatório em produção para a origem canônica (APP_URL).
 * 4. Origens localhost aceitas exclusivamente fora de produção (development/test).
 * 5. Uso de Referer como fallback apenas sob validação idêntica de origem completa.
 * 6. Zero confiança cega em cabeçalhos Host ou X-Forwarded-Host.
 */
export function validateTrustedOrigin(
  req: NextRequest,
  nodeEnv: string | undefined = process.env.NODE_ENV,
  appUrlEnv: string | undefined = process.env.APP_URL
): { valid: boolean; reason?: string } {
  const secFetchSite = req.headers.get('sec-fetch-site')?.toLowerCase();

  // 1. Defesa nativa contra requisições disparadas por origens externas
  if (secFetchSite && (secFetchSite === 'cross-site' || secFetchSite === 'none')) {
    return {
      valid: false,
      reason: `Requisição bloqueada por política Sec-Fetch-Site (${secFetchSite})`,
    };
  }

  // 2. Extração da Origem candidata (Origin primário, Referer como fallback estrito)
  const rawOrigin = req.headers.get('origin');
  let candidateOriginStr: string | null = null;

  if (rawOrigin && rawOrigin !== 'null') {
    candidateOriginStr = rawOrigin;
  } else {
    const rawReferer = req.headers.get('referer');
    if (!rawReferer) {
      return {
        valid: false,
        reason: 'Cabeçalhos Origin e Referer ausentes em operação protegida contra CSRF',
      };
    }
    try {
      candidateOriginStr = new URL(rawReferer).origin;
    } catch {
      return {
        valid: false,
        reason: 'Cabeçalho Referer malformado ou inválido',
      };
    }
  }

  // 3. Normalização estrita da origem candidata
  let normalizedCandidateOrigin: string;
  try {
    const parsedCandidate = new URL(candidateOriginStr);
    if (parsedCandidate.protocol !== 'http:' && parsedCandidate.protocol !== 'https:') {
      return { valid: false, reason: 'Protocolo de origem não suportado' };
    }
    normalizedCandidateOrigin = parsedCandidate.origin.toLowerCase();
  } catch {
    return { valid: false, reason: 'Cabeçalho Origin malformado ou inválido' };
  }

  // 4. Construção da lista de origens confiáveis configuradas no servidor
  const isProd = nodeEnv === 'production';
  const trustedOrigins = new Set<string>();

  if (isProd) {
    if (!appUrlEnv || appUrlEnv.trim() === '') {
      return {
        valid: false,
        reason: 'Configuração de segurança ausente: APP_URL não definida em produção',
      };
    }

    try {
      const parsedAppUrl = new URL(appUrlEnv);
      if (parsedAppUrl.protocol !== 'https:') {
        return {
          valid: false,
          reason: 'Política de segurança violada: APP_URL em produção exige protocolo HTTPS',
        };
      }
      trustedOrigins.add(parsedAppUrl.origin.toLowerCase());
    } catch {
      return {
        valid: false,
        reason: 'Configuração de segurança inválida: APP_URL malformada',
      };
    }
  } else {
    // Ambiente de desenvolvimento / teste: aceita origens locais estritas e APP_URL se configurada
    trustedOrigins.add('http://localhost:3000');
    trustedOrigins.add('http://127.0.0.1:3000');

    if (appUrlEnv && appUrlEnv.trim() !== '') {
      try {
        const parsedAppUrl = new URL(appUrlEnv);
        trustedOrigins.add(parsedAppUrl.origin.toLowerCase());
      } catch {
        // Ignora APP_URL malformada apenas em dev, mantendo localhost seguro
      }
    }
  }

  // 5. Comparação exata sem curingas ou sufixos parciais
  if (!trustedOrigins.has(normalizedCandidateOrigin)) {
    return {
      valid: false,
      reason: `Origem não autorizada (${normalizedCandidateOrigin})`,
    };
  }

  return { valid: true };
}

