import * as cheerio from 'cheerio';
import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class NoventaENoveJobsScraper implements JobScraper {
  name = '99jobs';

  async scrape(): Promise<RawJob[]> {
    try {
      const jobs = await this.scrapeViaHttp();
      if (jobs.length > 0) return jobs;
    } catch (e) {
      console.warn('[99jobsScraper] HTTP falhou, tentando Playwright:', (e as Error).message);
    }
    return await this.scrapeViaPlaywright();
  }

  private async scrapeViaHttp(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchUrls = [
      'https://www.99jobs.com/',
      'https://www.99jobs.com/opportunities/filtered_search?utf8=%E2%9C%93&q=desenvolvedor',
      'https://www.99jobs.com/opportunities/filtered_search?utf8=%E2%9C%93&q=tecnologia',
      'https://99jobs.com/collections/seu-proximo-estagio-ta-on',
    ];

    for (const url of searchUrls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('a[href*="/jobs/"]').each((_, a) => {
          const href = $(a).attr('href') || '';
          if (!href || href.includes('tagportal&utm_medium=ses_clientes')) return;

          const cleanUrl = href.split('?')[0];
          const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://99jobs.com${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
          if (seenUrls.has(fullUrl)) return;

          const rawText = $(a).text().replace(/\s+/g, ' ').trim();
          if (rawText.length < 5) return;

          const titleMatch = rawText.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9\s()/-]{4,50})/);
          const title = cleanJobTitle(titleMatch ? titleMatch[1].trim() : rawText.slice(0, 40));

          const matchEmpresa = fullUrl.match(/99jobs\.com\/([a-zA-Z0-9_-]+)\/jobs\//);
          const company = matchEmpresa ? matchEmpresa[1].replace(/-/g, ' ') : '99jobs';

          let location = 'Brasil';
          if (rawText.toLowerCase().includes('remoto')) {
            location = 'Remoto';
          }

          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company,
            platform: PlatformSource.NOVENTA_NOVE_JOBS,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
            location,
          });
        });
      } catch (err) {
        console.warn(`[99jobsScraper] Aviso para "${url}":`, (err as Error).message);
      }
    }

    return jobs;
  }

  private async scrapeViaPlaywright(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://www.99jobs.com/';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const items = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
        return links.map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLElement).innerText.trim().replace(/\s+/g, ' '),
        })).filter((x) => x.text.length > 5 && !x.href.includes('ses_clientes'));
      });

      const seenUrls = new Set<string>();
      for (const item of items) {
        const cleanUrl = item.href.split('?')[0];
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const matchEmpresa = cleanUrl.match(/99jobs\.com\/([a-zA-Z0-9_-]+)\/jobs\//);
        const company = matchEmpresa ? matchEmpresa[1].replace(/-/g, ' ') : '99jobs';
        const title = cleanJobTitle(item.text.slice(0, 50));

        jobs.push({
          title,
          company,
          platform: PlatformSource.NOVENTA_NOVE_JOBS,
          url: cleanUrl,
          description: `${title} - ${company}`,
          publishedAt: new Date(),
          location: 'Brasil',
        });
      }
    } catch (err) {
      console.warn('[99jobsScraper] Erro Playwright:', (err as Error).message);
    } finally {
      await browser.close().catch(() => {});
    }

    return jobs;
  }
}
