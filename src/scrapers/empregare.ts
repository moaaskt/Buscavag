import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class EmpregareScraper implements JobScraper {
  name = 'Empregare';

  async scrape(): Promise<RawJob[]> {
    try {
      const jobs = await this.scrapeViaHttp();
      if (jobs.length > 0) return jobs;
    } catch (e) {
      console.warn('[EmpregareScraper] HTTP falhou, tentando Playwright:', (e as Error).message);
    }
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchSlugs = ['desenvolvedor', 'programador', 'tecnologia', 'software', 'ti'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://www.empregare.com/pt-br/vagas?q=${encodeURIComponent(slug)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('li.card[data-id], .card[data-id]').each((_, el) => {
          const linkEl = $(el).find('h2.card__t a, a[data-vaga]').first();
          const href = linkEl.attr('href') || '';
          const rawTitle = linkEl.text().trim();
          if (!rawTitle) return;

          const title = cleanJobTitle(rawTitle);
          const fullUrl = href.startsWith('http') ? href : `https://www.empregare.com${href.startsWith('/') ? '' : '/'}${href}`;
          if (seenUrls.has(fullUrl)) return;

          const company = $(el).find('.card__e').text().trim() || 'Empresa Empregare';
          const location = $(el).find('.card__l').text().trim().replace(/\s*·\s*/, ' / ') || 'Brasil';
          const dateStr = $(el).find('time.card__d').attr('datetime') || '';
          const publishedAt = dateStr ? new Date(dateStr) : new Date();

          seenUrls.add(fullUrl);
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

    return jobs;
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://www.empregare.com/pt-br/vagas?q=desenvolvedor';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const cardData = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('li.card[data-id], .card[data-id]'));
        return cards.map((card) => {
          const linkEl = card.querySelector('h2.card__t a, a[data-vaga]') as HTMLAnchorElement;
          const rawTitle = linkEl ? linkEl.innerText.trim() : '';
          const href = linkEl ? linkEl.getAttribute('href') : '';
          const companyEl = card.querySelector('.card__e') as HTMLElement;
          const locationEl = card.querySelector('.card__l') as HTMLElement;
          const dateEl = card.querySelector('time.card__d') as HTMLElement;

          return {
            title: rawTitle,
            href,
            company: companyEl ? companyEl.innerText.trim() : 'Empresa Empregare',
            location: locationEl ? locationEl.innerText.trim() : 'Brasil',
            dateStr: dateEl ? dateEl.getAttribute('datetime') : null,
          };
        }).filter((j) => j.title && j.href);
      });

      for (const item of cardData) {
        const fullUrl = item.href?.startsWith('http') ? item.href : `https://www.empregare.com${item.href?.startsWith('/') ? '' : '/'}${item.href}`;
        jobs.push({
          title: cleanJobTitle(item.title),
          company: item.company,
          platform: PlatformSource.EMPREGARE,
          url: fullUrl,
          description: `${item.title} - ${item.company} (${item.location})`,
          publishedAt: item.dateStr ? new Date(item.dateStr) : new Date(),
          location: item.location,
        });
      }
    } catch (err) {
      console.warn('[EmpregareScraper] Erro Playwright:', (err as Error).message);
    } finally {
      await browser.close().catch(() => {});
    }

    return jobs;
  }
}
