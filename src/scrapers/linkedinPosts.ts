import fs from 'fs';
import path from 'path';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { isOlderThanDays } from '../utils/date.js';

interface ExtractedPost {
  urn: string;
  author: string;
  authorTitle?: string;
  text: string;
  permalink: string;
  publishedAt: Date;
  source: 'API' | 'DOM';
}

interface LinkedInSourcesConfig {
  maxSourcesPerCycle: number;
  maxPostsPerCycle: number;
  sources: Array<{
    name: string;
    url: string;
    type: 'profile' | 'company';
  }>;
}

const FIXED_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const LOCK_FILE = path.resolve(process.cwd(), 'data', 'linkedin.lock');
const COOLDOWN_FILE = path.resolve(process.cwd(), 'data', 'linkedin-cooldown.json');
const CONFIG_FILE = path.resolve(process.cwd(), 'config', 'linkedin-sources.json');

export class LinkedInPostsScraper implements JobScraper {
  name = 'LinkedIn Posts';

  // Palavras-chave para identificar oportunidades em publicações
  private jobKeywords = [
    'vaga', 'vagas', 'oportunidade', 'oportunidades', 'emprego', 'empregos',
    'contrat', 'contratando', 'contratação', 'hiring', 'looking for',
    'estamos contratando', 'estamos com vaga', 'abrimos vaga', 'possuo vaga',
    'dev', 'developer', 'desenvolvedor', 'desenvolvedora', 'programador', 'programadora',
    'fullstack', 'full-stack', 'frontend', 'front-end', 'backend', 'back-end',
    'junior', 'júnior', 'jr', 'estagio', 'estágio', 'trainee', 'iniciante',
    'pj', 'clt', 'remoto', 'home office', 'hibrido', 'híbrido',
    'currículo', 'curriculo', 'envie', 'enviar', 'cv', 'email', 'e-mail',
    'integração', 'integrações', 'apis', 'rest', 'node', 'react', 'typescript', 'php', 'python'
  ];

  // Callback opcional para interceptação de URLs em scripts de teste
  public onApiIntercepted?: (url: string, postCount: number) => void;

  async scrape(): Promise<RawJob[]> {
    // 1. Verificação de Cooldown (Anti-bot safety)
    if (this.isCooldownActive()) {
      return [];
    }

    // 2. Garantia de Execução Única (Lock simples)
    if (!this.acquireLock()) {
      console.warn('[LinkedInPostsScraper] 🔒 Scraper já em execução em outro processo ou lock ativo. Ignorando ciclo.');
      return [];
    }

    const jobs: RawJob[] = [];
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let isCdp = false;

    try {
      // 3. Conexão Principal: Chrome Real via CDP (porta 9222)
      try {
        browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 2000 });
        const contexts = browser.contexts();
        context = contexts[0] || (await browser.newContext());
        isCdp = true;
        console.log('[LinkedInPostsScraper] 🌐 Conectado ao Google Chrome real via CDP (porta 9222)!');
      } catch {
        // Porta 9222 fechada ou não responde
      }

      // 4. Fallback: Se a porta 9222 estiver fechada, tentar launchPersistentContext com channel: 'chrome'
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
          console.warn('[LinkedInPostsScraper] 👉 Para ativar o scraper do LinkedIn, execute no PowerShell: npm run chrome:linkedin');
          return [];
        }
      }

      // 5. Aba Própria e Isolada (nunca interage nem fecha outras abas do Chrome)
      page = await context.newPage();

      // Carregar fontes configuráveis
      const config = this.loadConfig();
      const extractedPostsMap = new Map<string, ExtractedPost>();

      // 6. Interceptação de API Interna (Voyager GraphQL / JSON)
      page.on('response', async (resp) => {
        try {
          const url = resp.url();
          const contentType = resp.headers()['content-type'] || '';
          const isVoyagerApi = url.includes('/voyager/api/') || url.includes('/graphql') || url.includes('profileUpdatesV2');

          if (isVoyagerApi && (contentType.includes('json') || contentType.includes('application/graphql'))) {
            if (resp.status() === 429) {
              console.warn('[LinkedInPostsScraper] ⚠️ HTTP 429 recebido na API interna.');
              this.setCooldown(6, 'HTTP 429 na API Voyager');
              return;
            }

            try {
              const body = await resp.json();
              const beforeCount = extractedPostsMap.size;
              this.parseVoyagerJson(body, extractedPostsMap);
              const afterCount = extractedPostsMap.size;

              if (this.onApiIntercepted && afterCount > beforeCount) {
                this.onApiIntercepted(url, afterCount - beforeCount);
              }
            } catch {}
          }
        } catch {}
      });

      // 7. Navegação Humana: sempre entrar por /feed/ primeiro
      console.log('[LinkedInPostsScraper] Acessando https://www.linkedin.com/feed/ ...');
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.humanPause(1200, 2500);

      const currentUrl = page.url();
      if (currentUrl.includes('/checkpoint') || currentUrl.includes('/authwall') || currentUrl.includes('/login')) {
        console.warn('[LinkedInPostsScraper] ⚠️ LinkedIn exigiu login/checkpoint. Ativando cooldown de 6 horas.');
        this.setCooldown(6, 'Checkpoint ou tela de login detectada em /feed/');
        return [];
      }

      // 8. Navegação gradual pelas fontes configuradas
      const sourcesToScrape = config.sources.slice(0, config.maxSourcesPerCycle);
      console.log(`[LinkedInPostsScraper] Varrendo ${sourcesToScrape.length} fonte(s) configurada(s)...`);

      for (const source of sourcesToScrape) {
        if (extractedPostsMap.size >= config.maxPostsPerCycle) {
          console.log(`[LinkedInPostsScraper] Limite de ${config.maxPostsPerCycle} posts por ciclo atingido.`);
          break;
        }

        console.log(`[LinkedInPostsScraper] Consultando atividade de: "${source.name}" (${source.url})`);
        try {
          await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await this.humanPause(1000, 2200);

          // Checagem de segurança após navegar
          if (page.url().includes('/checkpoint') || page.url().includes('/authwall')) {
            this.setCooldown(6, 'Checkpoint ao acessar fonte');
            break;
          }

          // Scroll suave com pausas para acionar carregamento dinâmico
          for (let s = 0; s < 3; s++) {
            await page.evaluate(() => window.scrollBy({ top: 650, behavior: 'smooth' }));
            await this.humanPause(800, 1600);
          }

          // 9. Extração DOM como Fallback/Complemento
          const domPosts = await this.extractPostsFromDom(page, source.name);
          for (const dp of domPosts) {
            if (!extractedPostsMap.has(dp.urn)) {
              extractedPostsMap.set(dp.urn, dp);
            }
          }
        } catch (sourceErr: any) {
          console.warn(`[LinkedInPostsScraper] Aviso ao acessar fonte "${source.name}":`, sourceErr.message);
        }
      }

      // 10. Processamento e Normalização das Vagas
      console.log(`[LinkedInPostsScraper] Total de publicações capturadas (API + DOM): ${extractedPostsMap.size}`);
      const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;

      for (const post of extractedPostsMap.values()) {
        if (jobs.length >= config.maxPostsPerCycle) break;

        // Limite de 7 dias
        if (isOlderThanDays(post.publishedAt, 7)) continue;

        const textLower = post.text.toLowerCase();
        const hasJobKeyword = this.jobKeywords.some((kw) => textLower.includes(kw));

        if (!hasJobKeyword && post.text.length < 50) {
          continue;
        }

        // Título amigável
        const lines = post.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
        const firstLine = lines[0] || `Oportunidade por ${post.author}`;
        const title = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;

        // Extração de e-mail de contato direto
        const matchedEmails = post.text.match(emailRegex) || [];
        const validEmail = matchedEmails.find(
          (e) => !e.toLowerCase().includes('linkedin.com') && !e.toLowerCase().includes('example.com')
        );

        jobs.push({
          title,
          company: post.author,
          platform: PlatformSource.LINKEDIN_POSTS,
          url: post.permalink,
          description: post.text,
          publishedAt: post.publishedAt,
          location: 'Remoto / Brasil',
          directContact: validEmail,
        });
      }

      console.log(`[LinkedInPostsScraper] Finalizado com ${jobs.length} vaga(s) estruturada(s) de publicações.`);
    } catch (err: any) {
      console.error('[LinkedInPostsScraper] Erro durante o ciclo:', err.message);
    } finally {
      // Fecha APENAS a aba aberta pelo Buscavag
      if (page) {
        try {
          await page.close();
        } catch {}
      }

      // Fecha o contexto apenas se foi lançado como fallback próprio (não via CDP do Chrome do usuário)
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
   * Parser recursivo seguro para respostas da API Voyager
   */
  private parseVoyagerJson(json: any, targetMap: Map<string, ExtractedPost>): void {
    if (!json || typeof json !== 'object') return;

    try {
      const updates: any[] = [];

      // Caso 1: Array "included" comum do GraphQL do LinkedIn
      if (Array.isArray(json.included)) {
        for (const item of json.included) {
          if (
            item.$type?.includes('Update') ||
            item.$type?.includes('Share') ||
            item.commentary ||
            item.updateMetadata
          ) {
            updates.push(item);
          }
        }
      }

      // Caso 2: Array elements direto
      if (Array.isArray(json.elements)) {
        updates.push(...json.elements);
      }

      for (const u of updates) {
        const text =
          u.commentary?.text?.text ||
          u.commentary?.text ||
          u.text?.text ||
          u.summary?.text ||
          '';

        if (typeof text === 'string' && text.trim().length > 30) {
          const urn = u.entityUrn || u.updateMetadata?.urn || `urn:li:activity:${Date.now()}_${Math.random()}`;
          const permalink = u.navigationUrl || u.permalink || (urn.includes('activity:') ? `https://www.linkedin.com/feed/update/${urn}/` : 'https://www.linkedin.com/feed/');

          let author = 'LinkedIn Member';
          if (u.actor?.name?.text) author = u.actor.name.text;
          else if (u.actor?.name) author = u.actor.name;

          const publishedAt = u.createdTime ? new Date(u.createdTime) : new Date();

          if (!targetMap.has(urn)) {
            targetMap.set(urn, {
              urn,
              author,
              text: text.trim(),
              permalink,
              publishedAt,
              source: 'API',
            });
          }
        }
      }
    } catch {}
  }

  /**
   * Extração segura via DOM (prioriza semântica, data-* e role, evitando classes CSS frágeis)
   */
  private async extractPostsFromDom(page: Page, fallbackAuthor: string): Promise<ExtractedPost[]> {
    try {
      // Clicar em botões de expandir texto truncado se visíveis
      await page.evaluate(() => {
        const expandButtons = document.querySelectorAll(
          'button[aria-label*="mais"], button[aria-label*="more"], button:has-text("ver mais"), button:has-text("see more")'
        );
        expandButtons.forEach((b) => {
          try {
            (b as HTMLElement).click();
          } catch {}
        });
      });

      const rawDomItems = await page.evaluate((defaultAuthor) => {
        const results: Array<{ urn: string; author: string; text: string; permalink: string }> = [];
        // Seletores semânticos e por atributos estáveis
        const postElements = document.querySelectorAll(
          'div[data-urn*="activity"], article, div[data-view-name*="feed-update"], div[role="region"]'
        );

        postElements.forEach((el, idx) => {
          const text = (el as HTMLElement).innerText || el.textContent || '';
          if (text.length < 40) return;

          const urn = el.getAttribute('data-urn') || el.getAttribute('data-activity-urn') || `dom-post-${idx}-${Date.now()}`;
          
          // Buscar permalink no post
          const linkEl = el.querySelector('a[href*="/feed/update/"], a[href*="activity:"]') as HTMLAnchorElement | null;
          const permalink = linkEl ? linkEl.href : window.location.href;

          // Autor
          const authorEl = el.querySelector('span[aria-hidden="true"], h2, a[href*="/in/"]') as HTMLElement | null;
          const author = authorEl?.innerText?.trim() || defaultAuthor;

          results.push({ urn, author, text: text.trim(), permalink });
        });

        return results;
      }, fallbackAuthor);

      return rawDomItems.map((r) => ({
        urn: r.urn,
        author: r.author,
        text: r.text,
        permalink: r.permalink,
        publishedAt: new Date(),
        source: 'DOM',
      }));
    } catch {
      return [];
    }
  }

  private loadConfig(): LinkedInSourcesConfig {
    const defaultConfig: LinkedInSourcesConfig = {
      maxSourcesPerCycle: 10,
      maxPostsPerCycle: 40,
      sources: [
        {
          name: 'Helton Chagas',
          url: 'https://www.linkedin.com/in/heltonchagas/recent-activity/all/',
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
