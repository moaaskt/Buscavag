import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

import { cleanJobTitle } from '../config/jobFilters.js';

export class EmpregaPalhocaScraper implements JobScraper {
  name = 'Emprega Palhoça';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchQueries = ['desenvolvedor', 'programador', 'full stack', 'software'];

    for (const q of searchQueries) {
      try {
        const url = `https://empregapalhoca.com.br/?s=${encodeURIComponent(q)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('article, .vaga, .post, .card-vaga, .job-item').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, .entry-title a, a[rel="bookmark"]');
          const dateEl = $(el).find('time, .entry-date, .published, .date');
          const excerptEl = $(el).find('.entry-summary, p, .vaga-descricao');

          const title = cleanJobTitle(titleEl.text());
          const href = titleEl.attr('href');
          if (!title || !href) return;

          const dateStr = dateEl.text().trim() || dateEl.attr('datetime') || '';
          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 5)) return;

          const excerpt = excerptEl.text().trim();

          jobs.push({
            title,
            company: 'Emprega Palhoça',
            platform: PlatformSource.EMPREGA_PALHOCA,
            url: href.startsWith('http') ? href : `https://empregapalhoca.com.br${href}`,
            description: excerpt ? `${title} - ${excerpt}` : title,
            publishedAt,
            location: 'Palhoça / SC',
          });
        });
      } catch (err) {
        console.warn(`[EmpregaPalhocaScraper] Aviso ao buscar "${q}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
