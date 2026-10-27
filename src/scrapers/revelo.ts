import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class ReveloScraper implements JobScraper {
  name = 'Revelo';

  async scrape(): Promise<RawJob[]> {
    // Revelo é uma SPA que depende de renderização client-side via JavaScript.
    // Inicialização direta via Playwright Stealth sem tentativa inútil de fetch estático prévio.
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://app.careers.revelo.com/home';

    try {
      const html = await fetchHtml(searchUrl);
      const $ = cheerio.load(html);

      $('.job-card, .opportunity-card, [data-testid="job-card"], article, .job-item').each((_, el) => {
        const titleEl = $(el).find('h2 a, h3 a, .job-title, a[href*="/jobs/"], a[href*="/vaga/"]');
        const companyEl = $(el).find('.company-name, .company, .empresa');
        const locationEl = $(el).find('.location, .cidade, .badge-location');
        const dateEl = $(el).find('time, .date, .data');

        const title = titleEl.text().trim();
        let href = titleEl.attr('href') || $(el).find('a').attr('href') || '';
        if (!title || !href) return;

        const company = companyEl.text().trim() || 'Revelo Partner';
        const location = locationEl.text().trim() || 'Remoto / Brasil';
        const dateStr = dateEl.text().trim();

        const publishedAt = parseRelativeDate(dateStr);
        if (isOlderThanDays(publishedAt, 7)) return;

        const fullUrl = href.startsWith('http') ? href : `https://app.careers.revelo.com${href.startsWith('/') ? '' : '/'}${href}`;

        jobs.push({
          title,
          company,
          platform: PlatformSource.REVELO,
          url: fullUrl,
          description: `${title} - ${company} (${location})`,
          publishedAt,
          location,
        });
      });
    } catch (err) {
      console.warn('[ReveloScraper] HTTP erro:', (err as Error).message);
    }

    if (jobs.length > 0) return jobs;
    throw new Error('Nenhuma vaga capturada via HTTP na Revelo');
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://app.careers.revelo.com/home';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cards = await page.$$('.job-card, .opportunity-card, [data-testid="job-card"], article');

      for (const card of cards) {
        try {
          const titleEl = await card.$('h2 a, h3 a, .job-title, a[href*="/jobs/"], a[href*="/vaga/"]');
          const companyEl = await card.$('.company-name, .company');
          const locationEl = await card.$('.location, .cidade');
          const dateEl = await card.$('time, .date');

          const title = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const company = companyEl ? (await companyEl.innerText()).trim() : 'Revelo Partner';
          const location = locationEl ? (await locationEl.innerText()).trim() : 'Remoto / Brasil';
          const dateStr = dateEl ? (await dateEl.innerText()).trim() : '';

          if (!title || !href) continue;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) continue;

          const fullUrl = href.startsWith('http') ? href : `https://app.careers.revelo.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.REVELO,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[ReveloScraper] Playwright erro:', (err as Error).message);
    } finally {
      await context.close();
      await browser.close();
    }

    return jobs;
  }
}
