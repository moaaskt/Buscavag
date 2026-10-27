import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class EmpregareScraper implements JobScraper {
  name = 'Empregare';

  async scrape(): Promise<RawJob[]> {
    // Empregare depende de renderização dinâmica no navegador via JavaScript.
    // Inicialização direta via Playwright Stealth para otimizar tempo no pipeline.
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchSlugs = ['desenvolvedor', 'programador', 'junior', 'full-stack', 'ti'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://empregare.com/pt-br/vagas?q=${encodeURIComponent(slug)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.card-vaga, .vaga-item, .job-item, article, [data-vaga-id]').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, .titulo-vaga a, a[href*="/vaga/"]');
          const companyEl = $(el).find('.empresa, .company, .nome-empresa');
          const locationEl = $(el).find('.cidade, .local, .location');
          const dateEl = $(el).find('time, .data, .date');

          const title = titleEl.text().trim();
          let href = titleEl.attr('href') || $(el).find('a').attr('href') || '';
          if (!title || !href) return;

          const company = companyEl.text().trim() || 'Empresa Empregare';
          const location = locationEl.text().trim() || 'Brasil';
          const dateStr = dateEl.text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) return;

          const fullUrl = href.startsWith('http') ? href : `https://empregare.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.EMPREGARE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[EmpregareScraper] Aviso para "${slug}":`, (err as Error).message);
      }
    }

    if (jobs.length > 0) return jobs;
    throw new Error('Nenhuma vaga capturada via HTTP na Empregare');
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://empregare.com/pt-br/vagas?q=desenvolvedor';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cards = await page.$$('.card-vaga, .vaga-item, .job-item, article');

      for (const card of cards) {
        try {
          const titleEl = await card.$('h2 a, h3 a, .titulo-vaga a, a[href*="/vaga/"]');
          const companyEl = await card.$('.empresa, .company');
          const locationEl = await card.$('.cidade, .local');
          const dateEl = await card.$('time, .data, .date');

          const title = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const company = companyEl ? (await companyEl.innerText()).trim() : 'Empresa Empregare';
          const location = locationEl ? (await locationEl.innerText()).trim() : 'Brasil';
          const dateStr = dateEl ? (await dateEl.innerText()).trim() : '';

          if (!title || !href) continue;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) continue;

          const fullUrl = href.startsWith('http') ? href : `https://empregare.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.EMPREGARE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[EmpregareScraper] Playwright erro:', (err as Error).message);
    } finally {
      await context.close();
      await browser.close();
    }

    return jobs;
  }
}
