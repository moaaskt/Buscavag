import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

import { cleanJobTitle } from '../config/jobFilters.js';

export class RecruteiEmpregosScraper implements JobScraper {
  name = 'Recrutei Empregos';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchSlugs = ['desenvolvedor', 'programador', 'fullstack', 'software'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://empregos.recrutei.com.br/?q=${encodeURIComponent(slug)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.job-card, .vaga-card, article, [class*="JobCard"], .card').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, [class*="title"] a, a[href*="/vaga/"], a[href*="/job/"]');
          const companyEl = $(el).find('[class*="company"], .empresa');
          const locationEl = $(el).find('[class*="location"], .local, .cidade');
          const dateEl = $(el).find('time, [class*="date"], .data');

          const title = cleanJobTitle(titleEl.text());
          let href = titleEl.attr('href') || $(el).find('a').attr('href') || '';
          if (!title || !href) return;

          const company = companyEl.text().trim() || 'Recrutei';
          const location = locationEl.text().trim() || 'Remoto / Brasil';
          const dateStr = dateEl.text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 5)) return;

          const fullUrl = href.startsWith('http') ? href : `https://empregos.recrutei.com.br${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.RECRUTEI_EMPREGOS,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[RecruteiEmpregosScraper] Aviso ao buscar "${slug}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
