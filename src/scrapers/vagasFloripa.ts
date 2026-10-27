import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

import { cleanJobTitle } from '../config/jobFilters.js';

export class VagasFloripaScraper implements JobScraper {
  name = 'Vagas Floripa';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchQueries = ['desenvolvedor', 'programador', 'full stack', 'software'];

    for (const q of searchQueries) {
      try {
        const url = `https://vagasfloripa.com.br/?s=${encodeURIComponent(q)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('article, .post, .vaga, .entry-card, .type-post').each((_, el) => {
          const titleEl = $(el).find('.entry-title a, h2 a, h3 a, a[rel="bookmark"]');
          const dateEl = $(el).find('time, .entry-date, .published, .post-date');
          const excerptEl = $(el).find('.entry-summary, .entry-content, p');

          const title = cleanJobTitle(titleEl.text());
          const href = titleEl.attr('href');
          if (!title || !href) return;

          const dateStr = dateEl.text().trim() || dateEl.attr('datetime') || '';
          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 5)) return;

          const excerpt = excerptEl.text().trim();

          jobs.push({
            title,
            company: 'Vagas Floripa',
            platform: PlatformSource.VAGAS_FLORIPA,
            url: href.startsWith('http') ? href : `https://vagasfloripa.com.br${href}`,
            description: excerpt ? `${title} - ${excerpt}` : title,
            publishedAt,
            location: 'Florianópolis / SC',
          });
        });
      } catch (err) {
        console.warn(`[VagasFloripaScraper] Aviso ao buscar "${q}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
