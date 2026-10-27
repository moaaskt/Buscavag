import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

import { cleanJobTitle } from '../config/jobFilters.js';

export class SaoJoseScraper implements JobScraper {
  name = 'São José Mais Empregos';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchQueries = ['desenvolvedor', 'programador', 'software', 'estagio-ti'];

    for (const q of searchQueries) {
      try {
        const url = `https://saojosemaisempregos.empregaja.org/vagas?q=${encodeURIComponent(q)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.card-vaga, .job-item, .vaga-card, article, .item-vaga').each((_, el) => {
          const titleEl = $(el).find('h2, h3, .card-title, .vaga-titulo, a[href*="/vaga/"]');
          const companyEl = $(el).find('.empresa, .company, .card-company');
          const locationEl = $(el).find('.local, .cidade, .location, .card-location');
          const dateEl = $(el).find('.data, time, .date, .card-date');
          const linkEl = $(el).find('a[href*="/vaga"], a[href*="saojosemaisempregos"]');

          const title = cleanJobTitle(titleEl.text());
          let href = linkEl.attr('href') || titleEl.attr('href') || '';
          if (!title || !href) return;

          const company = companyEl.text().trim() || 'São José Mais Empregos';
          const location = locationEl.text().trim() || 'São José / SC';
          const dateStr = dateEl.text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 5)) return;

          const fullUrl = href.startsWith('http') ? href : `https://saojosemaisempregos.empregaja.org${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.SAO_JOSE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[SaoJoseScraper] Aviso ao buscar "${q}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
