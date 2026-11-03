import fs from 'fs';
import path from 'path';
import { Browser, BrowserContext, Page } from 'playwright';
import { JobScraper, createStealthContext } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class LinkedInPostsScraper implements JobScraper {
  name = 'LinkedIn Posts';

  // Palavras-chave para filtro extra no front, e query do LinkedIn
  private jobKeywords = [
    'vaga', 'oportunidade', 'contrat', 'freela', 'freelance', 'projeto',
    'dev', 'developer', 'desenvolvedor', 'programador', 'fullstack', 'full-stack',
    'frontend', 'front-end', 'backend', 'back-end', 'junior', 'júnior', 'jr',
    'estagio', 'estágio', 'pj', 'clt', 'remoto', 'home office',
    'requisitos', 'candidat', 'curriculo', 'currículo', 'envie', 'enviar',
    'estamos contratando', 'hiring', 'we are hiring', 'we are looking'
  ];

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenPostUrns = new Set<string>();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const stealth = await createStealthContext();
      browser = stealth.browser;
      context = stealth.context;
      page = stealth.page;

      // 1. Injeção de Cookies de Sessão Seguros (li_at / LINKEDIN_SESSION_COOKIE)
      const hasCookies = await this.injectSessionCookies(context);
      
      if (!hasCookies) {
        console.warn('[LinkedInPostsScraper] unauthorized: Nenhum cookie de sessão ("li_at" / "LINKEDIN_SESSION_COOKIE") encontrado no .env ou li-cookies.json. O LinkedIn bloqueará a pesquisa de publicações.');
      }

      // 2. Otimização de Recursos: Bloquear mídias pesadas
      await page.route('**/*.{png,jpg,jpeg,webp,gif,svg,mp4,webm,woff,woff2,ttf}', (route) => route.abort());

      // 3. Montar a URL de busca com foco em posts e ordenação por mais recentes
      // Cobertura ampla: oportunidades, vagas, contratação e desenvolvimento web/tech
      const keywords = '("vagas" OR "oportunidades" OR "estamos contratando" OR "vaga júnior" OR "vaga full stack" OR "vaga front" OR "vaga back" OR #vagas) AND (dev OR desenvolvedor OR programador OR ti OR software)';
      const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keywords)}&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22`;

      console.log(`[LinkedInPostsScraper] Acessando URL de busca no Feed do LinkedIn:\n${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3500); // Esperar carregamento inicial da interface React

      // Checar se bateu em authwall ou login
      const pageUrl = page.url();
      if (pageUrl.includes('/login') || pageUrl.includes('/authwall')) {
        throw new Error('unauthorized session: LinkedIn redirecionou para tela de login ou authwall (verifique a validade do cookie li_at no .env).');
      }

      // 4. Estratégia de "Scroll & Harvest" devido à virtualização do DOM
      console.log(`[LinkedInPostsScraper] Iniciando extração contínua (Scroll & Harvest) de posts...`);
      let consecutiveEmptyScrolls = 0;
      
      // Realiza scrolls curtos colhendo os nós visíveis a cada parada
      for (let i = 0; i < 15; i++) {
        const batchJobs = await this.harvestVisiblePosts(page, seenPostUrns);
        
        if (batchJobs.length > 0) {
          jobs.push(...batchJobs);
          consecutiveEmptyScrolls = 0;
        } else {
          consecutiveEmptyScrolls++;
        }

        // Se passarmos 3 scrolls seguidos sem novos posts, finalizamos
        if (consecutiveEmptyScrolls >= 3) {
          break;
        }

        // Scroll suave simulando rolagem humana
        await page.evaluate(() => {
          window.scrollBy({ top: 850, behavior: 'smooth' });
        });
        await page.waitForTimeout(2000 + Math.random() * 1200);
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

      // 1. Variável direta de li_at (LINKEDIN_SESSION_COOKIE ou LI_AT_COOKIE)
      const directLiAt = process.env.LINKEDIN_SESSION_COOKIE || process.env.LI_AT_COOKIE || process.env.LINKEDIN_LI_AT;
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
      const seeMoreButtons = document.querySelectorAll('button.see-more-text__button, button.feed-shared-inline-show-more-text__see-more-less-toggle');
      seeMoreButtons.forEach((btn) => {
        try {
          (btn as HTMLElement).click();
        } catch {}
      });
    });
    
    await page.waitForTimeout(600);

    const rawPosts = await page.evaluate(() => {
      const posts: Array<{ urn: string; text: string; author: string; authorTitle: string; dateStr: string; permalink: string }> = [];
      
      const postElements = document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="activity"]');
      
      postElements.forEach((el) => {
        const urn = el.getAttribute('data-urn') || el.getAttribute('data-id') || '';
        if (!urn) return;

        const textEl = el.querySelector('.update-components-text, .feed-shared-update-v2__description, .feed-shared-text');
        const text = textEl?.textContent?.trim() || '';
        if (!text || text.length < 20) return;

        const authorEl = el.querySelector('.update-components-actor__name span[dir="ltr"], .feed-shared-actor__name, .update-components-actor__title');
        const author = authorEl?.textContent?.trim() || 'Recrutador / Empresa no LinkedIn';

        const authorTitleEl = el.querySelector('.update-components-actor__description span[dir="ltr"], .feed-shared-actor__description, .update-components-actor__sub-description');
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
