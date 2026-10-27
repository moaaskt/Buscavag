import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class NoventaENoveJobsScraper implements JobScraper {
  name = '99jobs';

  async scrape(): Promise<RawJob[]> {
    // 99jobs depende de renderização dinâmica no cliente via JavaScript.
    // Inicialização direta via Playwright Stealth sem roundtrip estático prévio.
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchSlugs = ['desenvolvedor', 'programador', 'junior', 'full-stack', 'tecnologia'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://www.99jobs.com/opportunities?utf8=%E2%9C%93&q=${encodeURIComponent(slug)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.opportunity-card, .job-item, article, [data-opportunity-id], .card-opportunity').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, .title a, a[href*="/opportunities/"]');
          const companyEl = $(el).find('.company-name, .company, .organization');
          const locationEl = $(el).find('.location, .city, .address');
          const dateEl = $(el).find('time, .date, .published');

          const title = titleEl.text().trim();
          let href = titleEl.attr('href') || $(el).find('a').attr('href') || '';
          if (!title || !href) return;

          const company = companyEl.text().trim() || 'Empresa 99jobs';
          const location = locationEl.text().trim() || 'Brasil';
          const dateStr = dateEl.text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) return;

          const fullUrl = href.startsWith('http') ? href : `https://www.99jobs.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.NOVENTA_NOVE_JOBS,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[99jobsScraper] Aviso para "${slug}":`, (err as Error).message);
      }
    }

    if (jobs.length > 0) return jobs;
    throw new Error('Nenhuma vaga capturada via HTTP na 99jobs');
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://www.99jobs.com/opportunities?q=desenvolvedor';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cards = await page.$$('.opportunity-card, .job-item, article, [data-opportunity-id]');

      for (const card of cards) {
        try {
          const titleEl = await card.$('h2 a, h3 a, .title a, a[href*="/opportunities/"]');
          const companyEl = await card.$('.company-name, .company, .organization');
          const locationEl = await card.$('.location, .city');
          const dateEl = await card.$('time, .date');

          const title = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const company = companyEl ? (await companyEl.innerText()).trim() : 'Empresa 99jobs';
          const location = locationEl ? (await locationEl.innerText()).trim() : 'Brasil';
          const dateStr = dateEl ? (await dateEl.innerText()).trim() : '';

          if (!title || !href) continue;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) continue;

          const fullUrl = href.startsWith('http') ? href : `https://www.99jobs.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.NOVENTA_NOVE_JOBS,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[99jobsScraper] Playwright erro:', (err as Error).message);
    } finally {
      await context.close();
      await browser.close();
    }

    return jobs;
  }
}
