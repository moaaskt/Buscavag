import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class WorkanaScraper implements JobScraper {
  name = 'Workana';

  private techKeywords = [
    'react', 'next', 'nextjs', 'node', 'nodejs', 'typescript', 'ts', 'javascript', 'js',
    'python', 'php', 'laravel', 'codeigniter', 'nestjs', 'express', 'vue', 'tailwind',
    'iot', 'esp32', 'esp8266', 'arduino', 'raspberry', 'mqtt', 'home assistant', 'automacao', 'automação',
    'full stack', 'fullstack', 'frontend', 'backend', 'rest', 'api', 'docker', 'web'
  ];

  async scrape(): Promise<RawJob[]> {
    // Workana bloqueia requisições HTTP estáticas via WAF/Cloudflare (403 Forbidden).
    // Execução direta via Playwright Stealth para contornar proteções.
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrls = [
      'https://www.workana.com/pt/jobs?category=it-programming&language=pt',
      'https://www.workana.com/pt/jobs?query=desenvolvedor&language=pt',
      'https://www.workana.com/pt/jobs?query=react+node&language=pt',
    ];

    for (const url of searchUrls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.project-item, .job-item, article, [data-project-id]').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, .project-title a, a[href*="/job/"]');
          const descEl = $(el).find('.project-details, .description, p.expander');
          const dateEl = $(el).find('time, .date, .project-header .date, span:contains("Publicado")');
          const budgetEl = $(el).find('.budget, .price, .values');

          const title = titleEl.text().trim();
          let href = titleEl.attr('href') || '';
          if (!title || !href) return;

          const desc = descEl.text().trim();
          const dateStr = dateEl.text().trim();
          const budget = budgetEl.text().trim();

          // Filtro de tech match
          const textToMatch = `${title} ${desc}`.toLowerCase();
          const hasTech = this.techKeywords.some((kw) => textToMatch.includes(kw));
          if (!hasTech) return;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 3)) return; // Projetos recentes

          const fullUrl = href.startsWith('http') ? href : `https://www.workana.com${href.startsWith('/') ? '' : '/'}${href}`;
          const fullDesc = `[Workana Dev] ${title} - ${desc ? desc.slice(0, 300) : 'Sem detalhes'} ${budget ? `(${budget})` : ''}`.trim();

          jobs.push({
            title: `[Workana] ${title}`,
            company: 'Workana (Cliente)',
            platform: PlatformSource.WORKANA,
            url: fullUrl,
            description: fullDesc,
            publishedAt,
            location: 'Remoto (Freelance)',
          });
        });
      } catch (err) {
        console.warn(`[WorkanaScraper] Erro para "${url}":`, (err as Error).message);
      }
    }

    if (jobs.length > 0) return jobs;
    throw new Error('Nenhum projeto capturado via HTTP na Workana');
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://www.workana.com/pt/jobs?category=it-programming&language=pt';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const items = await page.$$('.project-item, .job-item, article');

      for (const item of items) {
        try {
          const titleEl = await item.$('h2 a, h3 a, .project-title a, a[href*="/job/"]');
          const descEl = await item.$('.project-details, .description, p');
          const dateEl = await item.$('time, .date');

          const title = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const desc = descEl ? (await descEl.innerText()).trim() : '';
          const dateStr = dateEl ? (await dateEl.innerText()).trim() : '';

          if (!title || !href) continue;

          const textToMatch = `${title} ${desc}`.toLowerCase();
          const hasTech = this.techKeywords.some((kw) => textToMatch.includes(kw));
          if (!hasTech) continue;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 3)) continue;

          const fullUrl = href.startsWith('http') ? href : `https://www.workana.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title: `[Workana] ${title}`,
            company: 'Workana (Cliente)',
            platform: PlatformSource.WORKANA,
            url: fullUrl,
            description: `[Workana Dev] ${title} - ${desc ? desc.slice(0, 300) : 'Sem detalhes'}`.trim(),
            publishedAt,
            location: 'Remoto (Freelance)',
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[WorkanaScraper] Playwright erro:', (err as Error).message);
    } finally {
      await context.close();
      await browser.close();
    }

    return jobs;
  }
}
