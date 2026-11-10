import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';

export interface ExtractedPost {
  dedupeKey: string;
  urn: string;
  author: string;
  authorTitle?: string;
  text: string;
  permalink: string;
  publishedAt: Date;
  isDateKnown: boolean;
  dateText: string;
  dateFormatted?: string; // YYYY-MM-DD
  ageDays?: number;
  dateSource?: 'SNOWFLAKE_ID' | 'API_CREATED_TIME' | 'CONSERVATIVE_RELATIVE_TEXT';
  source: 'API' | 'DOM';
  sourceName?: string;
  directContact?: string;
}

export interface InterceptedApiResponse {
  sourceName: string;
  url: string;
  matched: boolean;
  postCount: number;
}

export interface LinkedInSourcesConfig {
  maxSourcesPerCycle: number;
  maxPostsPerCycle: number;
  maxDaysOld?: number;
  timeoutBaseSeconds?: number;
  timeoutPerSourceSeconds?: number;
  maxMenuClicksPerSource?: number;
  strongKeywords?: string[];
  weakKeywords?: string[];
  negativeKeywords?: string[];
  sources: Array<{
    name: string;
    url: string;
    type: 'profile' | 'company';
  }>;
}

export interface RelevanceEvaluation {
  approved: boolean;
  score: number;
  strongMatches: string[];
  weakMatches: string[];
  negativeMatches: string[];
  hasDirectContact: boolean;
  reason: string;
}

const FIXED_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const LOCK_FILE = path.resolve(process.cwd(), 'data', 'linkedin.lock');
const COOLDOWN_FILE = path.resolve(process.cwd(), 'data', 'linkedin-cooldown.json');
const CONFIG_FILE = path.resolve(process.cwd(), 'config', 'linkedin-sources.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'linkedin-seeded.json');
const STATE_FILE = path.resolve(process.cwd(), 'data', 'linkedin-state.json');

/**
 * Decodifica o timestamp Snowflake do LinkedIn a partir do ID numérico de 64 bits.
 * Fórmula do LinkedIn: timestamp_ms = Number(BigInt(id) >> 22n)
 */
export function extractLinkedInTimestamp(rawUrlOrUrnOrId: string): { timestampMs: number; date: Date; dateFormatted: string } | null {
  if (!rawUrlOrUrnOrId) return null;

  const match = rawUrlOrUrnOrId.match(/(\d{18,22})/);
  if (!match || !match[1]) return null;

  try {
    const id = BigInt(match[1]);
    const timestampMs = Number(id >> 22n);

    // Validação de sanidade: ano entre 2021 e 2035 (1609459200000 a 2051222400000)
    if (timestampMs >= 1609459200000 && timestampMs <= 2051222400000) {
      const date = new Date(timestampMs);
      const dateFormatted = date.toISOString().slice(0, 10); // YYYY-MM-DD
      return { timestampMs, date, dateFormatted };
    }
  } catch {}

  return null;
}

/**
 * Converte qualquer URN ou URL do LinkedIn em URL canônica absoluta válida:
 * https://www.linkedin.com/feed/update/<URN>/
 * Se não houver URN, usa a URL da fonte fornecida. NUNCA retorna um URN cru.
 */
export function formatLinkedInPostUrl(rawUrlOrUrn: string, fallbackSourceUrl: string): string {
  if (!rawUrlOrUrn || !rawUrlOrUrn.trim()) {
    return fallbackSourceUrl;
  }

  const clean = decodeURIComponent(rawUrlOrUrn.trim());

  // 1. Se já for uma URL HTTP(S) contendo URN ou ID
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const urnMatch = clean.match(/urn:li:(?:activity|share|ugcPost):\d+/i);
    if (urnMatch) {
      return `https://www.linkedin.com/feed/update/${urnMatch[0]}/`;
    }

    const numMatch =
      clean.match(/\/feed\/update\/(\d{16,22})/i) ||
      clean.match(/(?:activity|share|ugcPost)[:,-](\d{16,22})/i);
    if (numMatch && numMatch[1]) {
      return `https://www.linkedin.com/feed/update/urn:li:activity:${numMatch[1]}/`;
    }

    return clean.split('?')[0].split('#')[0];
  }

  // 2. Se for uma URN crua (urn:li:share:..., urn:li:activity:..., urn:li:ugcPost:...)
  const urnMatch = clean.match(/urn:li:(?:activity|share|ugcPost):\d+/i);
  if (urnMatch) {
    return `https://www.linkedin.com/feed/update/${urnMatch[0]}/`;
  }

  // 3. Se for apenas um ID numérico longo (16 a 22 dígitos)
  const numMatch = clean.match(/^(\d{16,22})$/);
  if (numMatch && numMatch[1]) {
    return `https://www.linkedin.com/feed/update/urn:li:activity:${numMatch[1]}/`;
  }

  return fallbackSourceUrl;
}

/**
 * Gera a chave de deduplicação unificada:
 * SEMPRE o hash MD5 de (autor + primeiros 200 caracteres do texto normalizado),
 * independentemente de vir de API ou DOM.
 */
export function generatePostDedupeKey(author: string, text: string): string {
  const normAuthor = (author || '').trim().toLowerCase();
  const normText = (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .substring(0, 200);

  const hash = crypto.createHash('md5').update(`${normAuthor}::${normText}`).digest('hex');
  return `dedupe_${hash}`;
}

/**
 * Verifica se o texto começa com "vaga" ou "oportunidade",
 * ignorando emojis e símbolos iniciais (ex: "🚨 Oportunidade ...", "🔥 VAGA ...").
 */
export function startsWithJobOrOpportunity(rawText: string): boolean {
  if (!rawText) return false;
  const stripped = rawText
    .replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/u, '')
    .trim()
    .toLowerCase();

  return stripped.startsWith('vaga') || stripped.startsWith('oportunidade');
}

/**
 * Limpa o texto antes de pontuar: remove hashtags (#palavra) e menções (@nome)
 */
export function cleanTextForScoring(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/@[\p{L}\p{N}_.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte textos relativos de data usando o LIMITE SUPERIOR da faixa (regra conservadora):
 * "X h" = X horas (~0 dias)
 * "X d" = X dias
 * "X sem" = X * 7 + 6 dias (ex: "1 sem" cobre de 7 a 13 dias -> pior caso 13 dias)
 * "X mês" = X * 30 + 29 dias (ex: "1 mês" cobre de 30 a 59 dias -> pior caso 59 dias)
 */
export function parseRelativeDateConservative(rawText: string): { ageDaysMax: number; isDateKnown: boolean; dateText: string } {
  if (!rawText) return { ageDaysMax: 0, isDateKnown: false, dateText: 'sem data' };

  const clean = rawText.trim();
  const match = clean.match(/\b(\d+)\s*(h|horas?|d|dias?|sem|semanas?|w|weeks?|m[êe]s(?:es)?|mo|months?|ano[s]?|yr|years?|min|minutos?)\b/i);
  if (!match) {
    return { ageDaysMax: 0, isDateKnown: false, dateText: 'sem data' };
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let ageDaysMax = 0;
  if (unit.startsWith('min') || unit.startsWith('h')) {
    ageDaysMax = 0;
  } else if (unit.startsWith('d')) {
    ageDaysMax = value;
  } else if (unit.startsWith('sem') || unit.startsWith('w')) {
    ageDaysMax = value * 7 + 6;
  } else if (unit.startsWith('m')) {
    ageDaysMax = value * 30 + 29;
  } else if (unit.startsWith('ano') || unit.startsWith('yr') || unit.startsWith('a')) {
    ageDaysMax = value * 365 + 364;
  }

  return {
    ageDaysMax,
    isDateKnown: true,
    dateText: match[0],
  };
}

/**
 * Avaliador de Relevância Estrito:
 * - Hashtags e menções removidas do texto antes de pontuar.
 * - Sinais fortes: texto começando com "vaga" ou "oportunidade" (ignorando emojis), "estamos contratando",
 *   "estamos buscando", "envie seu currículo", "envie seu cv", "candidate-se", "processo seletivo", ou e-mail de contato.
 * - Sinais fracos: somam pontuação, mas NUNCA aprovam sozinhos.
 * - Sinais negativos: avaliados por palavra inteira (word boundary).
 *   SÓ descartam se NÃO houver sinal forte. Posts com e-mail de contato ou que comecem com "vaga"/"oportunidade"
 *   são imunes e NUNCA são descartados por sinal negativo.
 */
export function evaluatePostRelevance(
  rawText: string,
  directContact: string | undefined,
  config: {
    strongKeywords: string[];
    weakKeywords: string[];
    negativeKeywords: string[];
  }
): RelevanceEvaluation {
  const hasDirectContact = Boolean(directContact);
  const startsWithJob = startsWithJobOrOpportunity(rawText);

  const cleanText = cleanTextForScoring(rawText);
  const cleanLower = cleanText.toLowerCase();

  // 1. Sinais Fortes
  const strongMatches: string[] = [];
  if (startsWithJob) {
    strongMatches.push('Começa com vaga/oportunidade');
  }
  if (hasDirectContact) {
    strongMatches.push(`Contato direto (${directContact})`);
  }

  for (const kw of config.strongKeywords) {
    const kwLower = kw.toLowerCase();
    const escaped = kwLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanLower)) {
      strongMatches.push(kw);
    }
  }

  // 2. Sinais Negativos
  const negativeMatches: string[] = [];
  for (const kw of config.negativeKeywords) {
    const kwLower = kw.toLowerCase();
    const escaped = kwLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanLower)) {
      negativeMatches.push(kw);
    }
  }

  // 3. Sinais Fracos
  const weakMatches: string[] = [];
  for (const kw of config.weakKeywords) {
    const kwLower = kw.toLowerCase();
    const escaped = kwLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanLower)) {
      weakMatches.push(kw);
    }
  }

  // REGRA A: Sinais fracos nunca aprovam sozinhos! É obrigatório ter pelo menos 1 sinal forte.
  const hasStrongSignal = strongMatches.length > 0;
  if (!hasStrongSignal) {
    return {
      approved: false,
      score: 0,
      strongMatches,
      weakMatches,
      negativeMatches,
      hasDirectContact,
      reason: 'Descartado: Sem sinal forte de vaga (apenas menção genérica ou termos fracos)',
    };
  }

  // REGRA B: Post com e-mail de contato ou que comece com "vaga"/"oportunidade" NUNCA é descartado por sinal negativo!
  const isImmuneToNegative = startsWithJob || hasDirectContact;

  if (negativeMatches.length > 0 && !isImmuneToNegative) {
    return {
      approved: false,
      score: 0,
      strongMatches,
      weakMatches,
      negativeMatches,
      hasDirectContact,
      reason: `Descartado: Sinais negativos de marketing/evento detectados (${negativeMatches.join(', ')})`,
    };
  }

  const score = strongMatches.length * 10 + weakMatches.length * 2;
  const immunityNote = isImmuneToNegative && negativeMatches.length > 0 ? ` [Imune a negativos: ${negativeMatches.join(', ')}]` : '';

  return {
    approved: true,
    score,
    strongMatches,
    weakMatches,
    negativeMatches,
    hasDirectContact,
    reason: `Aprovado com sinais fortes: [${strongMatches.join(', ')}]${immunityNote}`,
  };
}

export class LinkedInPostsScraper implements JobScraper {
  name = 'LinkedIn Posts';

  // Timeout próprio dinâmico (calculado como 60s + 35s × fontes varridas)
  public timeoutMs = 130000;

  // Callback para emitir eventos de resposta de API para o script de teste
  public onApiResponse?: (responseInfo: InterceptedApiResponse) => void;

  // Estatísticas detalhadas do ciclo para relatórios
  public stats = {
    totalRead: 0,
    passedRelevance: 0,
    discardedRelevance: 0,
    discardedByDate: 0,
    discardedWithoutDate: 0,
    postsWithoutUrn: 0,
    timedOutEarly: false,
    sourcesCompleted: 0,
    totalSourcesTargeted: 0,
    approvedPosts: [] as Array<{
      title: string;
      author: string;
      reason: string;
      dateFormatted: string;
      ageDays: number;
      dateInfo: string;
      dateSourceType: string;
      url: string;
      hasCanonicalUrn: boolean;
    }>,
    discardedPosts: [] as Array<{
      title: string;
      author: string;
      reason: string;
      dateInfo: string;
    }>,
  };

  // Mapa de posts extraídos para consulta de debug (Origem: API vs DOM)
  public lastExtractedPosts = new Map<string, ExtractedPost>();

  constructor() {
    this.updateDynamicTimeout();
  }

  /**
   * Atualiza o timeoutMs dinamicamente com base nas fontes e configurações:
   * timeout = 60s base + 35s por fonte efetiva
   */
  public updateDynamicTimeout(): number {
    const config = this.loadConfig();
    const base = typeof config.timeoutBaseSeconds === 'number' ? config.timeoutBaseSeconds : 60;
    const perSource = typeof config.timeoutPerSourceSeconds === 'number' ? config.timeoutPerSourceSeconds : 35;
    const sourcesCount = Math.min(config.sources.length || 1, config.maxSourcesPerCycle || 10);
    this.timeoutMs = (base + perSource * sourcesCount) * 1000;
    return this.timeoutMs;
  }

  /**
   * Insere ou mescla um post no mapa respeitando a chave unificada de dedupe:
   * Prefere a versão com link canônico e com o texto mais longo.
   */
  private insertOrMergePost(targetMap: Map<string, ExtractedPost>, newPost: ExtractedPost): void {
    const existing = targetMap.get(newPost.dedupeKey);
    if (!existing) {
      targetMap.set(newPost.dedupeKey, newPost);
      return;
    }

    const existingHasCanonical = existing.permalink.includes('/feed/update/urn:li:');
    const newHasCanonical = newPost.permalink.includes('/feed/update/urn:li:');

    if (newHasCanonical && !existingHasCanonical) {
      targetMap.set(newPost.dedupeKey, newPost);
    } else if (!newHasCanonical && existingHasCanonical) {
      if (newPost.text.length > existing.text.length) {
        existing.text = newPost.text;
      }
      if (newPost.directContact && !existing.directContact) {
        existing.directContact = newPost.directContact;
      }
    } else {
      if (newPost.text.length > existing.text.length) {
        targetMap.set(newPost.dedupeKey, newPost);
      } else {
        if (newPost.directContact && !existing.directContact) {
          existing.directContact = newPost.directContact;
        }
      }
    }

    if (newPost.isDateKnown && (!existing.isDateKnown || (newPost.dateSource === 'SNOWFLAKE_ID' && existing.dateSource !== 'SNOWFLAKE_ID'))) {
      existing.isDateKnown = true;
      existing.publishedAt = newPost.publishedAt;
      existing.dateFormatted = newPost.dateFormatted;
      existing.ageDays = newPost.ageDays;
      existing.dateText = newPost.dateText;
      existing.dateSource = newPost.dateSource;
    }
  }

  async scrape(): Promise<RawJob[]> {
    this.stats = {
      totalRead: 0,
      passedRelevance: 0,
      discardedRelevance: 0,
      discardedByDate: 0,
      discardedWithoutDate: 0,
      postsWithoutUrn: 0,
      timedOutEarly: false,
      sourcesCompleted: 0,
      totalSourcesTargeted: 0,
      approvedPosts: [],
      discardedPosts: [],
    };

    const cycleStartTime = Date.now();

    // 1. Verificação de Cooldown (Anti-bot safety)
    if (this.isCooldownActive()) {
      return [];
    }

    // 2. Garantia de Execução Única (Lock simples)
    if (!this.acquireLock()) {
      console.warn('[LinkedInPostsScraper] 🔒 Scraper já em execução em outro processo ou lock ativo. Ignorando ciclo.');
      return [];
    }

    // 3. Verificação do Modo Semente (Seed Mode)
    const isFirstSeedRun = !fs.existsSync(SEED_FILE);
    if (isFirstSeedRun) {
      console.log('[LinkedInPostsScraper] 🌱 MODO SEMENTE ATIVO: Primeiro ciclo detectado.');
      console.log('[LinkedInPostsScraper]    As vagas serão gravadas no banco mas NÃO dispararão flood no Telegram.');
    }

    const config = this.loadConfig();

    // Ordenação rotativa e circular de fontes para retomada contínua
    const allConfigSources = config.sources || [];
    const totalSources = allConfigSources.length;
    const lastSourceIdx = this.loadLastSourceIndex(totalSources);
    const startIdx = totalSources > 0 ? (lastSourceIdx + 1) % totalSources : 0;

    const orderedSources: typeof allConfigSources = [];
    for (let i = 0; i < totalSources; i++) {
      orderedSources.push(allConfigSources[(startIdx + i) % totalSources]);
    }

    const sourcesToScrape = orderedSources.slice(0, config.maxSourcesPerCycle || 10);
    this.stats.totalSourcesTargeted = sourcesToScrape.length;

    // Recalcula o timeout com precisão: 60s base + 35s por fonte efetiva
    const baseTimeoutSec = typeof config.timeoutBaseSeconds === 'number' ? config.timeoutBaseSeconds : 60;
    const perSourceSec = typeof config.timeoutPerSourceSeconds === 'number' ? config.timeoutPerSourceSeconds : 35;
    this.timeoutMs = (baseTimeoutSec + perSourceSec * sourcesToScrape.length) * 1000;

    // Margem de 15 segundos para finalização segura antes do corte externo
    const cycleDeadlineMs = cycleStartTime + this.timeoutMs - 15000;

    console.log(
      `[LinkedInPostsScraper] ⏱️ Timeout dinâmico configurado: ${this.timeoutMs / 1000}s (${baseTimeoutSec}s base + ${perSourceSec}s × ${sourcesToScrape.length} fontes).`
    );

    const jobs: RawJob[] = [];
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let isCdp = false;

    try {
      // 4. Conexão Principal: Chrome Real via CDP (porta 9222)
      try {
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 2500 }).catch(() =>
          chromium.connectOverCDP('http://localhost:9222', { timeout: 2500 })
        );
        const contexts = browser.contexts();
        context = contexts[0] || (await browser.newContext());
        isCdp = true;
        console.log('[LinkedInPostsScraper] 🌐 Conectado ao Google Chrome real via CDP (porta 9222)!');
      } catch {}

      // 5. Fallback: launchPersistentContext
      if (!context) {
        try {
          let profileDir = 'C:\\buscavag-chrome-profile';
          if (!fs.existsSync(profileDir)) {
            const userProfile = process.env.USERPROFILE || 'C:';
            profileDir = path.join(userProfile, 'buscavag-chrome-profile');
          }
          if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
          }

          context = await chromium.launchPersistentContext(profileDir, {
            headless: false,
            channel: 'chrome',
            userAgent: FIXED_USER_AGENT,
            args: [
              '--no-sandbox',
              '--disable-blink-features=AutomationControlled',
              '--no-first-run',
              '--no-default-browser-check',
            ],
            viewport: { width: 1280, height: 800 },
          });
          console.log(`[LinkedInPostsScraper] 🖥️ Inicializado contexto persistente em "${profileDir}".`);
        } catch (launchErr: any) {
          console.warn('[LinkedInPostsScraper] ℹ️ Chrome de automação não detectado na porta 9222 e fallback indisponível:', launchErr.message);
          return [];
        }
      }

      // 6. Aba Própria e Isolada
      page = await context.newPage();

      const strongKeywords = config.strongKeywords && config.strongKeywords.length > 0
        ? config.strongKeywords
        : ['estamos contratando', 'estamos buscando', 'envie seu currículo', 'envie seu curriculo', 'envie seu cv', 'candidate-se', 'processo seletivo'];

      const weakKeywords = config.weakKeywords && config.weakKeywords.length > 0
        ? config.weakKeywords
        : ['vaga', 'vagas', 'oportunidade', 'oportunidades', 'dev', 'desenvolvedor', 'remoto', 'júnior', 'junior', 'pleno', 'sênior', 'home office', 'clt', 'pj'];

      const negativeKeywords = config.negativeKeywords && config.negativeKeywords.length > 0
        ? config.negativeKeywords
        : ['evento', 'webinar', 'stand', 'palestra', 'parabéns', 'aniversário', 'feliz dia', 'patrocínio', 'febraban', 'feira'];

      // Default de maxDaysOld = 7 dias
      const maxDaysOld = typeof config.maxDaysOld === 'number' ? config.maxDaysOld : 7;
      const maxMenuClicks = typeof config.maxMenuClicksPerSource === 'number' ? config.maxMenuClicksPerSource : 5;

      const extractedPostsMap = new Map<string, ExtractedPost>();
      let currentSourceName = 'LinkedIn Feed';
      let currentSourceUrl = 'https://www.linkedin.com/feed/';

      // 7. Interceptação de API Interna (Voyager GraphQL / JSON)
      page.on('response', async (resp) => {
        try {
          const url = resp.url();
          const contentType = resp.headers()['content-type'] || '';
          const isVoyagerOrGraphql =
            url.includes('/voyager/api/') ||
            url.includes('/graphql') ||
            url.includes('voyagerIdentityDash') ||
            url.includes('voyagerFeedDash') ||
            url.includes('profileUpdatesV2');

          if (isVoyagerOrGraphql && (contentType.includes('json') || contentType.includes('graphql'))) {
            if (resp.status() === 429) {
              console.warn('[LinkedInPostsScraper] ⚠️ HTTP 429 recebido na API interna.');
              this.setCooldown(6, 'HTTP 429 na API Voyager');
              return;
            }

            try {
              const body = await resp.json();
              const beforeCount = extractedPostsMap.size;
              this.parseGenericVoyagerJson(body, extractedPostsMap, currentSourceName, currentSourceUrl);
              const afterCount = extractedPostsMap.size;
              const newPosts = afterCount - beforeCount;

              if (this.onApiResponse) {
                this.onApiResponse({
                  sourceName: currentSourceName,
                  url,
                  matched: newPosts > 0,
                  postCount: newPosts,
                });
              }
            } catch {}
          }
        } catch {}
      });

      // 8. Navegação Humana: entrar por /feed/ primeiro
      console.log('[LinkedInPostsScraper] Acessando https://www.linkedin.com/feed/ ...');
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.humanPause(1200, 2200);

      const currentUrl = page.url();
      if (currentUrl.includes('/checkpoint') || currentUrl.includes('/authwall') || currentUrl.includes('/login')) {
        console.warn('[LinkedInPostsScraper] ⚠️ LinkedIn exigiu login/checkpoint. Ativando cooldown de 6 horas.');
        this.setCooldown(6, 'Checkpoint ou tela de login detectada em /feed/');
        return [];
      }

      // 9. Navegação sequencial com salvamento parcial e controle de deadline
      console.log(`[LinkedInPostsScraper] Varrendo ${sourcesToScrape.length} fonte(s) configurada(s) (iniciando do índice rotativo ${startIdx})...`);

      for (let sIdx = 0; sIdx < sourcesToScrape.length; sIdx++) {
        if (Date.now() > cycleDeadlineMs) {
          console.warn(
            `[LinkedInPostsScraper] ⏱️ Deadline de segurança atingido (${Math.round((Date.now() - cycleStartTime) / 1000)}s decorridos).`
          );
          console.warn(
            `[LinkedInPostsScraper]    Encerrando varredura e salvando estado. As fontes restantes serão varridas no próximo ciclo!`
          );
          this.stats.timedOutEarly = true;
          break;
        }

        if (extractedPostsMap.size >= config.maxPostsPerCycle) {
          console.log(`[LinkedInPostsScraper] Limite de ${config.maxPostsPerCycle} posts por ciclo atingido.`);
          break;
        }

        const source = sourcesToScrape[sIdx];
        currentSourceName = source.name;
        currentSourceUrl = source.url;

        const originalIndex = allConfigSources.findIndex((s) => s.url === source.url);

        console.log(`\n[LinkedInPostsScraper] 🔎 Acessando fonte [${sIdx + 1}/${sourcesToScrape.length}]: "${source.name}" (${source.url})`);

        try {
          await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await this.humanPause(1200, 2000);

          if (page.url().includes('/checkpoint') || page.url().includes('/authwall')) {
            this.setCooldown(6, 'Checkpoint ao acessar fonte');
            break;
          }

          // Rolagem gradual com pausas para carregar conteúdo dinâmico
          for (let s = 0; s < 4; s++) {
            await page.evaluate(() => window.scrollBy({ top: 650, behavior: 'smooth' }));
            await this.humanPause(900, 1500);
          }

          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1500);

          // Extração do DOM com filtro de relevância prévio e teto de cliques no menu (default: 5)
          const domPosts = await this.extractPostsFromDom(page, source.name, source.url, maxMenuClicks, strongKeywords);
          console.log(`[LinkedInPostsScraper] Posts válidos extraídos via DOM na fonte "${source.name}": ${domPosts.length}`);

          for (const dp of domPosts) {
            this.insertOrMergePost(extractedPostsMap, dp);
          }

          this.stats.sourcesCompleted++;
          if (originalIndex !== -1) {
            this.saveLastSourceIndex(originalIndex);
          }
        } catch (sourceErr: any) {
          console.warn(`[LinkedInPostsScraper] Aviso ao processar fonte "${source.name}":`, sourceErr.message);
        }
      }

      // 10. Filtragem de Relevância e Filtro Estrito de Data (default: 7 dias)
      this.lastExtractedPosts = extractedPostsMap;
      const allPosts = Array.from(extractedPostsMap.values());
      this.stats.totalRead = allPosts.length;
      console.log(`\n[LinkedInPostsScraper] Total de posts brutos únicos lidos (API + DOM): ${this.stats.totalRead}`);

      const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;

      for (const post of allPosts) {
        if (jobs.length >= config.maxPostsPerCycle) break;

        const lines = post.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5);
        const firstLine = lines[0] || `Oportunidade por ${post.author}`;
        const title = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;

        // Determinação da data: Snowflake ID primário, ou relativo como fallback conservador
        let publishedAt = post.publishedAt;
        let isDateKnown = post.isDateKnown;
        let ageDays = post.ageDays;
        let dateFormatted = post.dateFormatted || '';
        let dateInfo = post.dateText;
        let dateSourceType = post.dateSource || 'UNKNOWN';

        const snowflake = extractLinkedInTimestamp(post.urn || post.permalink);
        if (snowflake) {
          publishedAt = snowflake.date;
          dateFormatted = snowflake.dateFormatted;
          ageDays = Math.max(0, Math.floor((Date.now() - snowflake.timestampMs) / (1000 * 60 * 60 * 24)));
          isDateKnown = true;
          dateSourceType = 'SNOWFLAKE_ID';
          dateInfo = `${dateFormatted} (${ageDays}d atrás - Snowflake ID)`;
        }

        // Se não tiver data em nenhuma fonte, descarta
        if (!isDateKnown || typeof ageDays !== 'number') {
          this.stats.discardedWithoutDate++;
          this.stats.discardedPosts.push({
            title,
            author: post.author,
            reason: 'Descartado: Data não identificada em nenhuma fonte (API/ID/DOM)',
            dateInfo: 'sem data',
          });
          continue;
        }

        // Filtro estrito de data: limite de N dias (default: 7 dias)
        if (ageDays > maxDaysOld) {
          this.stats.discardedByDate++;
          this.stats.discardedPosts.push({
            title,
            author: post.author,
            reason: `Data antiga (${dateFormatted} - ${ageDays} dias atrás > limite de ${maxDaysOld} dias)`,
            dateInfo: post.dateText,
          });
          continue;
        }

        const matchedEmails = post.text.match(emailRegex) || [];
        const directContact = matchedEmails.find(
          (e) => !e.toLowerCase().includes('linkedin.com') && !e.toLowerCase().includes('example.com')
        );

        const relevance = evaluatePostRelevance(post.text, directContact, {
          strongKeywords,
          weakKeywords,
          negativeKeywords,
        });

        if (!relevance.approved) {
          this.stats.discardedRelevance++;
          this.stats.discardedPosts.push({
            title,
            author: post.author,
            reason: relevance.reason,
            dateInfo,
          });
          continue;
        }

        const jobUrl = formatLinkedInPostUrl(post.permalink, currentSourceUrl);
        const hasCanonicalUrn = jobUrl.includes('/feed/update/urn:li:');
        if (!hasCanonicalUrn) {
          this.stats.postsWithoutUrn++;
        }

        this.stats.passedRelevance++;
        this.stats.approvedPosts.push({
          title,
          author: post.author,
          reason: relevance.reason,
          dateFormatted,
          ageDays,
          dateInfo,
          dateSourceType,
          url: jobUrl,
          hasCanonicalUrn,
        });

        jobs.push({
          title,
          company: post.author,
          platform: PlatformSource.LINKEDIN_POSTS,
          url: jobUrl,
          description: post.text,
          publishedAt,
          location: 'Remoto / Brasil',
          directContact,
          ...(isFirstSeedRun ? { isSeedBatch: true } : {}),
        } as RawJob);
      }

      // 11. Finalização do Modo Semente se for o primeiro ciclo
      if (isFirstSeedRun && jobs.length > 0) {
        try {
          const dir = path.dirname(SEED_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(
            SEED_FILE,
            JSON.stringify(
              {
                seededAt: new Date().toISOString(),
                totalSeeded: jobs.length,
                note: 'Primeiro ciclo semeado com sucesso no banco. Para reativar o modo semente, delete este arquivo.',
              },
              null,
              2
            ),
            'utf-8'
          );
          console.log(`[LinkedInPostsScraper] 🌱 Modo semente concluído: ${jobs.length} vagas registradas em "${SEED_FILE}".`);
        } catch {}
      }

      console.log(
        `[LinkedInPostsScraper] Filtro de relevância: ${this.stats.passedRelevance} aprovados, ${this.stats.discardedRelevance} marketing descartados, ${this.stats.discardedByDate} expirados (>${maxDaysOld}d), ${this.stats.discardedWithoutDate} sem data.`
      );
      console.log(`[LinkedInPostsScraper] Finalizado com ${jobs.length} vaga(s) estruturada(s).`);
    } catch (err: any) {
      console.error('[LinkedInPostsScraper] Erro durante o ciclo:', err.message);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {}
      }

      if (!isCdp && context) {
        try {
          await context.close();
        } catch {}
      }

      this.releaseLock();
    }

    return jobs;
  }

  /**
   * Parser genérico para extrair publicações de respostas GraphQL/Voyager
   */
  private parseGenericVoyagerJson(json: any, targetMap: Map<string, ExtractedPost>, sourceName: string, sourceUrl: string): void {
    if (!json || typeof json !== 'object') return;

    try {
      const candidates: any[] = [];
      this.collectUpdateObjects(json, candidates);

      for (const u of candidates) {
        const text =
          u.commentary?.text?.text ||
          u.commentary?.text ||
          u.text?.text ||
          u.summary?.text ||
          u.attributedText?.text ||
          '';

        if (typeof text === 'string' && text.trim().length > 30) {
          const rawUrn =
            u.entityUrn ||
            u.updateMetadata?.urn ||
            u.dashEntityUrn ||
            u.navigationUrl ||
            '';

          const canonicalUrl = formatLinkedInPostUrl(rawUrn, sourceUrl);

          let author = sourceName || 'LinkedIn Member';
          if (u.actor?.name?.text) author = u.actor.name.text;
          else if (u.actor?.name) author = u.actor.name;

          let publishedAt = new Date();
          let isDateKnown = false;
          let ageDays: number | undefined;
          let dateFormatted = '';
          let dateSource: 'SNOWFLAKE_ID' | 'API_CREATED_TIME' | 'CONSERVATIVE_RELATIVE_TEXT' | undefined;
          let dateText = 'sem data';

          const snowflake = extractLinkedInTimestamp(rawUrn || canonicalUrl);
          if (snowflake) {
            publishedAt = snowflake.date;
            dateFormatted = snowflake.dateFormatted;
            isDateKnown = true;
            ageDays = Math.max(0, Math.floor((Date.now() - snowflake.timestampMs) / (1000 * 60 * 60 * 24)));
            dateSource = 'SNOWFLAKE_ID';
            dateText = `${dateFormatted} (${ageDays}d atrás - ID)`;
          } else if (u.createdTime && typeof u.createdTime === 'number') {
            publishedAt = new Date(u.createdTime);
            dateFormatted = publishedAt.toISOString().slice(0, 10);
            isDateKnown = true;
            ageDays = Math.max(0, Math.floor((Date.now() - u.createdTime) / (1000 * 60 * 60 * 24)));
            dateSource = 'API_CREATED_TIME';
            dateText = `${dateFormatted} (${ageDays}d atrás - API)`;
          }

          const dedupeKey = generatePostDedupeKey(author, text);

          this.insertOrMergePost(targetMap, {
            dedupeKey,
            urn: rawUrn || dedupeKey,
            author,
            text: text.trim(),
            permalink: canonicalUrl,
            publishedAt,
            isDateKnown,
            dateFormatted,
            dateText,
            ageDays,
            dateSource,
            source: 'API',
            sourceName,
          });
        }
      }
    } catch {}
  }

  private collectUpdateObjects(obj: any, results: any[]): void {
    if (!obj || typeof obj !== 'object') return;

    const type = obj.$type || '';
    const hasCommentary = Boolean(obj.commentary && (obj.commentary.text || typeof obj.commentary === 'string'));
    const isUpdateLike =
      type.includes('Update') ||
      type.includes('Share') ||
      type.includes('FeedUpdate') ||
      hasCommentary ||
      Boolean(obj.updateMetadata && obj.commentary);

    if (isUpdateLike && (obj.commentary || obj.text || obj.summary || obj.attributedText)) {
      results.push(obj);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.collectUpdateObjects(item, results);
      }
    } else {
      for (const key of Object.keys(obj)) {
        if (key !== 'meta' && key !== 'extensions' && key !== 'request') {
          this.collectUpdateObjects(obj[key], results);
        }
      }
    }
  }

  /**
   * Extração segura via DOM:
   * 1. Primeiro avalia a relevância do texto.
   * 2. SÓ CLICA no menu "..." se o post tiver sinal forte de vaga e ainda não tiver URN explícito.
   * 3. Posts descartados por texto NÃO consomem cliques do menu.
   * 4. Respeita o teto de cliques (maxMenuClicks, default: 5).
   */
  private async extractPostsFromDom(
    page: Page,
    sourceAuthor: string,
    sourceUrl: string,
    maxMenuClicks: number = 5,
    strongKeywords: string[] = []
  ): Promise<ExtractedPost[]> {
    try {
      const rawDomItems = await page.evaluate(
        async ({ defaultAuthor, defaultSourceUrl, maxClicks, strongKws }) => {
          // 1. Expandir "...mais" ou "ver mais"
          const allButtons = Array.from(document.querySelectorAll('button'));
          for (const btn of allButtons) {
            const t = (btn.innerText || btn.textContent || '').trim().toLowerCase();
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            const isExpandBtn =
              t === '… mais' ||
              t === '...mais' ||
              t === 'mais' ||
              t.includes('ver mais') ||
              t.includes('see more') ||
              label.includes('mais') ||
              label.includes('more') ||
              btn.classList.contains('feed-shared-inline-show-more-text__see-more-less-toggle');

            if (isExpandBtn) {
              try {
                (btn as HTMLElement).click();
              } catch {}
            }
          }

          await new Promise((r) => setTimeout(r, 600));

          // 2. Identificar cards de publicação no DOM
          const postElements = Array.from(
            document.querySelectorAll('div[role="listitem"], div.feed-shared-update-v2, article, div[data-urn*="activity"]')
          );

          // Função de sinal rápido de vaga para não gastar cliques em marketing ou textos genéricos
          function hasJobSignal(text: string): boolean {
            const lower = text.toLowerCase();
            const stripped = lower.replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/u, '').trim();
            if (stripped.startsWith('vaga') || stripped.startsWith('oportunidade')) return true;
            if (/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(text)) return true;
            for (const kw of strongKws) {
              if (lower.includes(kw.toLowerCase())) return true;
            }
            return false;
          }

          const cardDataList: Array<{
            el: HTMLElement;
            author: string;
            text: string;
            permalink: string;
            rawDateText: string;
            needsMenuClick: boolean;
          }> = [];

          for (let idx = 0; idx < postElements.length; idx++) {
            const el = postElements[idx] as HTMLElement;

            const textBox = el.querySelector('[data-testid="expandable-text-box"], .feed-shared-update-v2__description, .update-components-text');
            const text = (textBox ? (textBox as HTMLElement).innerText || textBox.textContent : el.innerText || el.textContent || '').trim();

            const lowerText = text.toLowerCase();
            if (
              text.length < 35 ||
              lowerText.startsWith('dúvidas?') ||
              lowerText.startsWith('gerencie sua conta') ||
              lowerText.startsWith('visibilidade da recomendação') ||
              lowerText.startsWith('recomendações') ||
              lowerText.startsWith('avaliações') ||
              lowerText.includes('gerencie sua conta e privacidade')
            ) {
              continue;
            }

            const authorEl = el.querySelector(
              '.update-components-actor__name, .feed-shared-actor__name, h2 span:not(.visually-hidden), [data-testid="actor-name"]'
            ) as HTMLElement | null;
            let author = authorEl?.innerText?.trim() || defaultAuthor;
            if (author === 'Publicação no feed' || author.toLowerCase().includes('feed') || author.length < 3) {
              author = defaultAuthor;
            }

            let rawDateText = '';
            const timeEl = el.querySelector('time, .update-components-actor__sub-description, .feed-shared-actor__sub-description, [data-testid="actor-sub-description"]') as HTMLElement | null;
            if (timeEl) {
              rawDateText = (timeEl.innerText || timeEl.textContent || '').trim();
            }
            if (!rawDateText) {
              const dateMatch = el.innerText?.match(/\b(\d+)\s*(h|d|sem|w|m[êe]s(?:es)?|mo|ano[s]?)\b/i);
              if (dateMatch) rawDateText = dateMatch[0];
            }

            let permalink = '';
            const explicitLink = el.querySelector('a[href*="/feed/update/"], a[href*="activity:"], a[href*="share:"]') as HTMLAnchorElement | null;
            if (explicitLink && explicitLink.href) {
              permalink = explicitLink.href;
            }

            const isJob = hasJobSignal(text);
            const needsMenu = isJob && !permalink;

            cardDataList.push({
              el,
              author,
              text,
              permalink,
              rawDateText,
              needsMenuClick: needsMenu,
            });
          }

          // 3. Ordem do Pipeline: SÓ CLICA no menu "..." para posts APROVADOS pelo texto
          // Posts descartados por texto NÃO consomem cliques!
          let menuClicksCount = 0;

          for (const card of cardDataList) {
            if (card.needsMenuClick && menuClicksCount < maxClicks) {
              const menuBtn = card.el.querySelector('button[aria-label*="menu de controle"], button[aria-label*="control menu"], button[aria-label*="menu"]') as HTMLElement | null;
              if (menuBtn) {
                menuClicksCount++;
                try {
                  // Garante que dropdowns anteriores estejam fechados
                  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                  await new Promise((r) => setTimeout(r, 200));

                  card.el.scrollIntoView({ block: 'center', behavior: 'instant' });
                  await new Promise((r) => setTimeout(r, 300));

                  menuBtn.click();

                  // Polling para o dropdown renderizar no DOM
                  let embedLink: HTMLAnchorElement | null = null;
                  for (let wait = 0; wait < 6; wait++) {
                    await new Promise((r) => setTimeout(r, 200));
                    embedLink = document.querySelector('a[href*="targetUrn="], a[href*="embed-modal"], a[data-view-name="feed-control-menu-embed"]') as HTMLAnchorElement | null;
                    if (embedLink) break;
                  }

                  if (embedLink && embedLink.href) {
                    const m = embedLink.href.match(/targetUrn=([^&"]+)/);
                    if (m && m[1]) {
                      const decoded = decodeURIComponent(m[1]);
                      const urnMatch = decoded.match(/urn:li:(share|activity|ugcPost):(\d+)/i);
                      if (urnMatch) {
                        card.permalink = `https://www.linkedin.com/feed/update/${urnMatch[0]}/`;
                      }
                    }
                  }

                  if (!card.permalink) {
                    const bodyHtml = document.body.innerHTML;
                    const m =
                      bodyHtml.match(/targetUrn=urn%3Ali%3A(share|activity|ugcPost)%3A(\d+)/i) ||
                      bodyHtml.match(/urn:li:(share|activity|ugcPost):(\d{18,22})/i);
                    if (m && m[1] && m[2]) {
                      card.permalink = `https://www.linkedin.com/feed/update/urn:li:${m[1]}:${m[2]}/`;
                    }
                  }

                  // Fecha menu com tecla Escape
                  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                  await new Promise((r) => setTimeout(r, 200));
                } catch {}
              }
            }
          }

          const results: Array<{
            urn: string;
            author: string;
            text: string;
            permalink: string;
            rawDateText: string;
          }> = [];

          for (const card of cardDataList) {
            const hasUrn = Boolean(
              card.permalink && (card.permalink.includes('activity') || card.permalink.includes('share') || card.permalink.includes('ugcPost'))
            );
            const hasValidDate = Boolean(
              card.rawDateText && /\b\d+\s*(h|horas?|d|dias?|sem|semanas?|w|weeks?|m[êe]s(?:es)?|mo|ano[s]?)\b/i.test(card.rawDateText)
            );

            if (!hasUrn && !hasValidDate) {
              continue;
            }

            if (!card.permalink) {
              card.permalink = defaultSourceUrl;
            }

            results.push({
              urn: card.permalink,
              author: card.author,
              text: card.text,
              permalink: card.permalink,
              rawDateText: card.rawDateText,
            });
          }

          return results;
        },
        { defaultAuthor: sourceAuthor, defaultSourceUrl: sourceUrl, maxClicks: maxMenuClicks, strongKws: strongKeywords }
      );

      return rawDomItems.map((r) => {
        const canonicalUrl = formatLinkedInPostUrl(r.permalink, sourceUrl);
        const dedupeKey = generatePostDedupeKey(r.author, r.text);

        const snowflake = extractLinkedInTimestamp(canonicalUrl || r.urn);
        let publishedAt = new Date();
        let isDateKnown = false;
        let dateFormatted = '';
        let ageDays: number | undefined;
        let dateSource: 'SNOWFLAKE_ID' | 'CONSERVATIVE_RELATIVE_TEXT' | undefined;
        let dateText = 'sem data';

        if (snowflake) {
          publishedAt = snowflake.date;
          dateFormatted = snowflake.dateFormatted;
          isDateKnown = true;
          ageDays = Math.max(0, Math.floor((Date.now() - snowflake.timestampMs) / (1000 * 60 * 60 * 24)));
          dateSource = 'SNOWFLAKE_ID';
          dateText = `${dateFormatted} (${ageDays}d atrás - ID)`;
        } else {
          // Data conservadora pelo limite superior da faixa
          const dateParsed = parseRelativeDateConservative(r.rawDateText);
          if (dateParsed.isDateKnown) {
            ageDays = dateParsed.ageDaysMax;
            publishedAt = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
            dateFormatted = publishedAt.toISOString().slice(0, 10);
            isDateKnown = true;
            dateSource = 'CONSERVATIVE_RELATIVE_TEXT';
            dateText = `${dateFormatted} (~${dateParsed.dateText} - limite superior ${ageDays}d)`;
          }
        }

        return {
          dedupeKey,
          urn: r.urn,
          author: r.author,
          text: r.text,
          permalink: canonicalUrl,
          publishedAt,
          isDateKnown,
          dateFormatted,
          dateText,
          ageDays,
          dateSource,
          source: 'DOM' as const,
          sourceName: sourceAuthor,
        };
      });
    } catch (err: any) {
      console.warn(`[LinkedInPostsScraper] Aviso em extractPostsFromDom (${sourceAuthor}):`, err.message);
      return [];
    }
  }

  private loadConfig(): LinkedInSourcesConfig {
    const defaultConfig: LinkedInSourcesConfig = {
      maxSourcesPerCycle: 10,
      maxPostsPerCycle: 40,
      maxDaysOld: 7,
      timeoutBaseSeconds: 60,
      timeoutPerSourceSeconds: 35,
      maxMenuClicksPerSource: 5,
      sources: [
        {
          name: 'Helton Chagas',
          url: 'https://www.linkedin.com/in/helton-chagas/recent-activity/all/',
          type: 'profile',
        },
        {
          name: '200DEV',
          url: 'https://www.linkedin.com/company/200dev/posts/',
          type: 'company',
        },
      ],
    };

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(fileContent) };
      } catch {}
    }

    return defaultConfig;
  }

  private loadLastSourceIndex(totalSources: number): number {
    if (totalSources <= 0) return 0;
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        if (typeof data.lastSourceIndex === 'number') {
          return data.lastSourceIndex;
        }
      }
    } catch {}
    return -1;
  }

  private saveLastSourceIndex(index: number): void {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify({ lastSourceIndex: index, lastRunTimestamp: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    } catch {}
  }

  private acquireLock(): boolean {
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const stats = fs.statSync(LOCK_FILE);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < 10 * 60 * 1000) {
          return false;
        }
      } catch {}
    }

    try {
      const dir = path.dirname(LOCK_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');
      return true;
    } catch {
      return true;
    }
  }

  private releaseLock(): void {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
    } catch {}
  }

  private isCooldownActive(): boolean {
    if (!fs.existsSync(COOLDOWN_FILE)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf-8'));
      if (data.pausedUntil && Date.now() < data.pausedUntil) {
        const remainingMin = Math.round((data.pausedUntil - Date.now()) / (60 * 1000));
        console.warn(
          `[LinkedInPostsScraper] ⏸️ LinkedIn Posts pausado por segurança até ${new Date(
            data.pausedUntil
          ).toLocaleTimeString('pt-BR')} (~${remainingMin} min restantes). Motivo: ${data.reason || 'Anti-bot'}`
        );
        return true;
      }
    } catch {}
    return false;
  }

  private setCooldown(hours: number = 6, reason: string = 'Checkpoint/Anti-bot detectado'): void {
    try {
      const pausedUntil = Date.now() + hours * 3600 * 1000;
      const dir = path.dirname(COOLDOWN_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        COOLDOWN_FILE,
        JSON.stringify({ pausedUntil, reason, timestamp: new Date().toISOString() }, null, 2),
        'utf-8'
      );
      console.warn(`[LinkedInPostsScraper] 🛑 Ativado cooldown de ${hours}h para o LinkedIn (${reason}).`);
    } catch {}
  }

  private async humanPause(minMs: number = 800, maxMs: number = 2200): Promise<void> {
    const pauseTime = Math.floor(minMs + Math.random() * (maxMs - minMs));
    await new Promise((r) => setTimeout(r, pauseTime));
  }
}
