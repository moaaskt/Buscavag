import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class RunTalentScraper implements JobScraper {
  name = 'RunTalent';

  async scrape(): Promise<RawJob[]> {
    // RunTalent utiliza Zoho Recruit com renderização client-side via JavaScript.
    // Inicialização direta via Playwright Stealth para evitar requisição estática vazia.
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const url = 'https://runtalent.zohorecruit.com/jobs/Careers';

    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      $('.cw-job-card, .job-item, tr.job-row, .rec-job-info, .cw-job-title').each((_, el) => {
        const titleEl = $(el).find('a.cw-job-title, a[href*="/jobs/Careers/"], h3 a, h2 a, a');
        const companyEl = $(el).find('.cw-company, .company');
        const locationEl = $(el).find('.cw-location, .location, .city');
        const dateEl = $(el).find('.cw-date, .date, time');

        const title = titleEl.text().trim();
        let href = titleEl.attr('href') || '';
        if (!title || !href) return;

        const company = companyEl.text().trim() || 'RunTalent';
        const location = locationEl.text().trim() || 'Remoto / Brasil';
        const dateStr = dateEl.text().trim();

        const publishedAt = parseRelativeDate(dateStr);
        if (isOlderThanDays(publishedAt, 7)) return;

        const fullUrl = href.startsWith('http') ? href : `https://runtalent.zohorecruit.com${href.startsWith('/') ? '' : '/'}${href}`;

        jobs.push({
          title,
          company,
          platform: PlatformSource.RUNTALENT,
          url: fullUrl,
          description: `${title} - ${company} (${location})`,
          publishedAt,
          location,
        });
      });
    } catch (err) {
      console.warn('[RunTalentScraper] HTTP erro:', (err as Error).message);
    }

    if (jobs.length > 0) return jobs;
    throw new Error('Nenhuma vaga capturada via HTTP na RunTalent');
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const url = 'https://runtalent.zohorecruit.com/jobs/Careers';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cards = await page.$$('.cw-job-card, .job-item, tr.job-row, [class*="job"]');

      for (const card of cards) {
        try {
          const titleEl = await card.$('a[href*="/jobs/Careers/"], a.cw-job-title, h3 a');
          const locationEl = await card.$('.cw-location, .location, .city');
          const dateEl = await card.$('.cw-date, .date, time');

          const title = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const location = locationEl ? (await locationEl.innerText()).trim() : 'Remoto / Brasil';
          const dateStr = dateEl ? (await dateEl.innerText()).trim() : '';

          if (!title || !href) continue;

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) continue;

          const fullUrl = href.startsWith('http') ? href : `https://runtalent.zohorecruit.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company: 'RunTalent',
            platform: PlatformSource.RUNTALENT,
            url: fullUrl,
            description: `${title} - RunTalent (${location})`,
            publishedAt,
            location,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[RunTalentScraper] Playwright erro:', (err as Error).message);
    } finally {
      await context.close();
      await browser.close();
    }

    return jobs;
  }
}
