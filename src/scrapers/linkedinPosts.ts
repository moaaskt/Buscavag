import fs from 'fs';
import path from 'path';
import { Browser, BrowserContext, Page } from 'playwright';
import { JobScraper, createStealthContext } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class LinkedInPostsScraper implements JobScraper {
  name = 'LinkedIn Posts';

  // Palavras-chave para filtro extra no front e correspondência com posts
  private jobKeywords = [
    'vaga', 'vagas', 'oportunidade', 'oportunidades', 'emprego', 'empregos',
    'contrat', 'contratando', 'contratação', 'hiring', 'we are hiring', 'we are looking',
    'estamos contratando', 'estamos com vaga', 'abrimos vaga', 'possuo vaga',
    'dev', 'developer', 'desenvolvedor', 'desenvolvedora', 'programador', 'programadora',
    'fullstack', 'full-stack', 'frontend', 'front-end', 'backend', 'back-end',
    'junior', 'júnior', 'jr', 'estagio', 'estágio', 'trainee', 'iniciante',
    'pj', 'clt', 'remoto', 'home office', 'hibrido', 'híbrido',
    'requisitos', 'candidat', 'curriculo', 'currículo', 'envie', 'enviar',
    'integração', 'integrações', 'apis', 'rest', 'node', 'react', 'typescript', 'php', 'python'
  ];

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenPostUrns = new Set<string>();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const userDataDir = path.resolve(process.cwd(), 'data', 'linkedin_profile');
      const hasUserData = fs.existsSync(userDataDir) && fs.readdirSync(userDataDir).length > 2;

      if (hasUserData) {
        console.log('[LinkedInPostsScraper] 🔐 Utilizando perfil persistente autenticado de "data/linkedin_profile"...');
        context = await (await import('playwright')).chromium.launchPersistentContext(userDataDir, {
          headless: true,
          channel: 'chrome',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
          ],
          viewport: { width: 1366, height: 768 },
          locale: 'pt-BR',
          timezoneId: 'America/Sao_Paulo',
        });
        page = context.pages()[0] || (await context.newPage());
      } else {
        const stealth = await createStealthContext();
        browser = stealth.browser;
        context = stealth.context;
        page = stealth.page;

        // Injeção de Cookies de Sessão Seguros (li_at / LINKEDIN_SESSION_COOKIE)
        const hasCookies = await this.injectSessionCookies(context);
        if (!hasCookies) {
          console.warn('[LinkedInPostsScraper] ℹ️ Nenhum cookie de sessão ("li_at" / "LINKEDIN_SESSION_COOKIE") válido encontrado no .env. Execute "npm run auth:linkedin" para conectar.');
          return [];
        }
      }

      // Bloquear mídias pesadas para economizar banda
      await page.route('**/*.{png,jpg,jpeg,webp,gif,svg,mp4,webm,woff,woff2,ttf}', (route) => route.abort());

      // Queries focadas em postagens recentes de oportunidades
      const queries = [
        '("vagas" OR "oportunidade" OR "contratando" OR #vagas OR empregos) AND ("desenvolvedor" OR "developer" OR "programador" OR "fullstack" OR "junior" OR "estagio")',
        '("junior" OR "jr" OR "estágio") AND ("desenvolvedor" OR "programador" OR "dev" OR "full stack")',
      ];

      for (const query of queries) {
        const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22`;
        console.log(`[LinkedInPostsScraper] Buscando publicações no Feed do LinkedIn:\n${searchUrl}`);

        let navResponse = null;
        try {
          navResponse = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          if (navResponse && navResponse.status() === 429) {
            console.warn('[LinkedInPostsScraper] ⚠️ LinkedIn/Cloudflare respondeu com HTTP 429 (Too Many Requests / Proteção contra automação). Pulando consulta.');
            break;
          }
        } catch (navErr: any) {
          if (
            navErr.message?.includes('ERR_TOO_MANY_REDIRECTS') ||
            navErr.message?.includes('chrome-error') ||
            navErr.message?.includes('net::ERR_ABORTED') ||
            navErr.message?.includes('ERR_HTTP_RESPONSE_CODE_FAILURE')
          ) {
            console.warn('[LinkedInPostsScraper] ⚠️ Sessão do LinkedIn expirada ou bloqueada por redirecionamento. Execute "npm run auth:linkedin" para renovar o acesso.');
            break;
          }
          throw navErr;
        }

        await page.waitForTimeout(3000);

        const pageUrl = page.url();
        if (pageUrl.includes('/login') || pageUrl.includes('/authwall') || pageUrl.includes('/checkpoint')) {
          console.warn('[LinkedInPostsScraper] ⚠️ LinkedIn solicitou tela de login/checkpoint. Execute "npm run auth:linkedin" para renovar.');
          break;
        }

        // Scroll & Harvest
        let consecutiveEmptyScrolls = 0;
        for (let i = 0; i < 8; i++) {
          const batchJobs = await this.harvestVisiblePosts(page, seenPostUrns);
          if (batchJobs.length > 0) {
            jobs.push(...batchJobs);
            consecutiveEmptyScrolls = 0;
          } else {
            consecutiveEmptyScrolls++;
          }

          if (consecutiveEmptyScrolls >= 3) break;

          await page.evaluate(() => {
            window.scrollBy({ top: 850, behavior: 'smooth' });
          });
          await page.waitForTimeout(1800 + Math.random() * 1000);
        }
      }

    } catch (err) {
      console.error('[LinkedInPostsScraper] Erro geral durante execução do scraper:', (err as Error).message);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          console.warn('[LinkedInPostsScraper] Erro ao fechar navegador Playwright:', (closeErr as Error).message);
        }
      }
    }

    if (jobs.length === 0 && (process.env.NODE_ENV === 'test' || process.env.LI_MOCK === 'true')) {
      return this.generateMockJobs();
    }

    console.log(`[LinkedInPostsScraper] Finalizado com ${jobs.length} publicações estruturadas de feed do LinkedIn.`);
    return jobs;
  }

  /**
   * Injeta os cookies do LinkedIn para evasão stealth
   * Suporta nativamente:
   * 1. LINKEDIN_SESSION_COOKIE ou LI_AT_COOKIE (valor puro do cookie li_at)
   * 2. LI_COOKIES_JSON (array json no .env)
   * 3. Arquivo li-cookies.json / data/li-cookies.json
   */
  public async injectSessionCookies(context: BrowserContext): Promise<boolean> {
    try {
      let cookies: any[] = [];

      // 1. Variável direta de li_at e JSESSIONID
      const directLiAt = process.env.LINKEDIN_SESSION_COOKIE || process.env.LI_AT_COOKIE || process.env.LINKEDIN_LI_AT;
      const directJsessionId = process.env.LINKEDIN_JSESSIONID || process.env.JSESSIONID;

      if (directLiAt && directLiAt.trim().length > 10) {
        cookies.push({
          name: 'li_at',
          value: directLiAt.trim(),
          domain: '.linkedin.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        });

        if (directJsessionId && directJsessionId.trim().length > 3) {
          const raw = directJsessionId.trim();
          const cleanValue = raw.startsWith('"') && raw.endsWith('"') ? raw : `"${raw}"`;
          cookies.push({
            name: 'JSESSIONID',
            value: cleanValue,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'None',
          });
        }
      }

      // 2. Via array JSON em LI_COOKIES_JSON
      if (cookies.length === 0 && process.env.LI_COOKIES_JSON) {
        const raw = process.env.LI_COOKIES_JSON.trim();
        if (raw.startsWith('[') && raw.endsWith(']')) {
          try {
            cookies = JSON.parse(raw);
          } catch (jsonErr) {
            console.warn('[LinkedInPostsScraper] JSON inválido em LI_COOKIES_JSON');
          }
        }
      }

      // 3. Via arquivo local li-cookies.json
      if (cookies.length === 0) {
        const cookieFilePaths = [
          process.env.LI_COOKIES_PATH,
          path.resolve(process.cwd(), 'li-cookies.json'),
          path.resolve(process.cwd(), 'data', 'li-cookies.json'),
        ].filter(Boolean) as string[];

        for (const filePath of cookieFilePaths) {
          if (fs.existsSync(filePath)) {
            try {
              const fileContent = fs.readFileSync(filePath, 'utf-8');
              cookies = JSON.parse(fileContent);
              console.log(`[LinkedInPostsScraper] Carregados ${cookies.length} cookies a partir de "${filePath}".`);
              break;
            } catch (readErr) {
              console.warn(`[LinkedInPostsScraper] Falha ao carregar cookies de "${filePath}":`, (readErr as Error).message);
            }
          }
        }
      }

      if (cookies.length > 0) {
        const validCookies = cookies.map((c: any) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.linkedin.com',
          path: c.path || '/',
          httpOnly: Boolean(c.httpOnly),
          secure: Boolean(c.secure),
          sameSite: (c.sameSite === 'Strict' || c.sameSite === 'Lax' || c.sameSite === 'None') ? c.sameSite : 'None',
        }));

        await context.addCookies(validCookies);
        console.log(`[LinkedInPostsScraper] ✅ ${validCookies.length} cookie(s) de sessão do LinkedIn injetados com sucesso.`);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[LinkedInPostsScraper] Aviso ao injetar cookies:', (err as Error).message);
      return false;
    }
  }

  /**
   * Captura os posts atualmente visíveis no DOM
   */
  private async harvestVisiblePosts(page: Page, seenPostUrns: Set<string>): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    
    // Expandir textos longos clicando nos botões "ver mais"
    await page.evaluate(() => {
      const seeMoreButtons = document.querySelectorAll(
        'button.see-more-text__button, button.feed-shared-inline-show-more-text__see-more-less-toggle, button[aria-label*="mais"], button[aria-label*="more"], button.inline-show-more-text__button'
      );
      seeMoreButtons.forEach((btn) => {
        try {
          (btn as HTMLElement).click();
        } catch {}
      });
    });
    
    await page.waitForTimeout(600);

    const rawPosts = await page.evaluate(() => {
      const posts: Array<{ urn: string; text: string; author: string; authorTitle: string; dateStr: string; permalink: string }> = [];
      
      const postElements = document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="activity"], div[data-id*="activity"]');
      
      postElements.forEach((el) => {
        const urn = el.getAttribute('data-urn') || el.getAttribute('data-id') || '';
        if (!urn) return;

        const textEl = el.querySelector(
          '.update-components-update-v2__commentary, .feed-shared-inline-show-more-text, .update-components-text, .feed-shared-update-v2__description, .feed-shared-text, [data-ad-preview="message"], span.break-words'
        );
        const text = textEl?.textContent?.trim() || '';
        if (!text || text.length < 20) return;

        const authorEl = el.querySelector('.update-components-actor__name span[dir="ltr"], .feed-shared-actor__name, .update-components-actor__title, .update-components-actor__name');
        const author = authorEl?.textContent?.trim() || 'Recrutador / Empresa no LinkedIn';

        const authorTitleEl = el.querySelector('.update-components-actor__description span[dir="ltr"], .feed-shared-actor__description, .update-components-actor__sub-description, .update-components-actor__description');
        const authorTitle = authorTitleEl?.textContent?.trim() || '';

        const dateEl = el.querySelector('.update-components-actor__sub-description span[dir="ltr"], .update-components-actor__sub-description span[aria-hidden="true"], .feed-shared-actor__sub-description');
        let dateStr = dateEl?.textContent?.trim() || 'Hoje';
        
        dateStr = dateStr.replace(/editado|edited/i, '').replace(/•/g, '').trim();

        // Extrai permalink ou monta via URN
        const linkEl = el.querySelector('a.feed-shared-control-menu__trigger, a[href*="/feed/update/"]');
        let permalink = linkEl?.getAttribute('href') || '';
        if (!permalink || !permalink.includes('linkedin.com')) {
          permalink = `https://www.linkedin.com/feed/update/${urn}/`;
        }

        posts.push({ urn, text, author, authorTitle, dateStr, permalink });
      });

      return posts;
    });

    for (const p of rawPosts) {
      if (seenPostUrns.has(p.urn)) continue;
      
      const lowerText = p.text.toLowerCase();
      const isJobRelated = this.jobKeywords.some((kw) => lowerText.includes(kw));
      
      if (!isJobRelated) {
        seenPostUrns.add(p.urn);
        continue;
      }

      const publishedAt = parseRelativeDate(p.dateStr);
      
      // Limitamos a 7 dias para evitar posts arquivados
      if (isOlderThanDays(publishedAt, 7)) {
        seenPostUrns.add(p.urn);
        continue;
      }

      seenPostUrns.add(p.urn);

      // Gerar título amigável baseado na primeira linha significativa do post
      const candidateLines = p.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
      const firstLine = candidateLines[0] || 'Oportunidade em LinkedIn Post';
      const title = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
      
      const company = `${p.author} ${p.authorTitle ? `(${p.authorTitle})` : ''}`.trim().substring(0, 100);

      jobs.push({
        title,
        company,
        platform: PlatformSource.LINKEDIN_POSTS,
        url: p.permalink,
        description: p.text,
        publishedAt,
        location: 'Remoto / LinkedIn',
      });
    }

    return jobs;
  }

  private generateMockJobs(): RawJob[] {
    const now = new Date();
    return [
      {
        title: 'Estamos contratando! Vaga de Desenvolvedor Frontend Sênior',
        company: 'João Silva - Tech Recruiter na EmpresaX',
        platform: PlatformSource.LINKEDIN_POSTS,
        url: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890/',
        description: 'Estamos contratando! Vaga de Desenvolvedor Frontend Sênior com foco em React e TypeScript. Contrato CLT, 100% remoto.\nInteressados enviem o currículo para vagas@empresax.com.br ou me chamem na DM.',
        publishedAt: now,
        location: 'Remoto / LinkedIn',
      },
      {
        title: 'Oportunidade para Estágio em Desenvolvimento de Software',
        company: 'Maria Souza - HR Manager',
        platform: PlatformSource.LINKEDIN_POSTS,
        url: 'https://www.linkedin.com/feed/update/urn:li:activity:0987654321/',
        description: 'Vaga de estágio aberta! Buscamos estudantes de tecnologia apaixonados por backend. Stack: Node.js e SQL.\n#vagas #ti #estagio\nEnvie seu currículo para estagios@techstart.com',
        publishedAt: now,
        location: 'Remoto / LinkedIn',
      }
    ];
  }
}
