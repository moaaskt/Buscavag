import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class BebeeScraper implements JobScraper {
  name = 'beBee';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchQueries = ['desenvolvedor', 'programador', 'react node', 'full stack'];

    for (const query of searchQueries) {
      try {
        const url = `https://bebee.com/br/jobs?q=${encodeURIComponent(query)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('h3 a[href*="/br/jobs/"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (
            !href ||
            href === '/br/jobs' ||
            href.includes('/br/jobs/role') ||
            href.includes('/br/jobs/remote')
          ) {
            return;
          }

          const fullUrl = href.startsWith('http') ? href : `https://bebee.com${href}`;
          if (seenUrls.has(fullUrl)) return;
          seenUrls.add(fullUrl);

          const title = $(el).text().trim();
          if (!title) return;

          // Localiza o card pai
          const card = $(el).closest('div[role="link"]').length
            ? $(el).closest('div[role="link"]')
            : $(el)
                .parents()
                .filter((_, p) => $(p).find('h3 a[href*="/br/jobs/"]').length === 1 && $(p).find('p').length > 0)
                .first();

          const location =
            card.find('svg.lucide-map-pin').parent().text().trim() || 'Brasil';
          const company =
            card.find('a[href*="/br/companies/"]').first().text().trim() ||
            card.find('img + a, span.truncate a').first().text().trim() ||
            'beBee Partner';
          const description = card.find('p').first().text().trim() || `${title} - ${company} (${location})`;
          const dateStr = card.find('svg.lucide-clock').parent().text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 7)) return;

          jobs.push({
            title,
            company,
            platform: PlatformSource.BEBEE,
            url: fullUrl,
            description,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[BebeeScraper] Aviso ao buscar "${query}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
