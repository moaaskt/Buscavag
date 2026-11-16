import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class BebeeScraper implements JobScraper {
  name = 'beBee';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchQueries = ['desenvolvedor', 'programador', 'full stack', 'software'];

    for (const query of searchQueries) {
      try {
        const url = `https://bebee.com/br/jobs?q=${encodeURIComponent(query)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('a[href*="/br/jobs/"]').each((_, el) => {
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

          const rawText = $(el).text().trim().replace(/\s+/g, ' ');
          if (rawText.length < 4) return;

          const title = cleanJobTitle(rawText);

          // Extrair empresa e local do slug da URL ou do card
          // Ex: /br/jobs/desenvolvedor-junior-chromotech-itaquaquecetuba--ij-...
          const slugMatch = href.match(/\/br\/jobs\/([a-zA-Z0-9_-]+)/);
          let company = 'beBee Partner';
          let location = 'Brasil';

          if (slugMatch) {
            const parts = slugMatch[1].split('--')[0].split('-');
            if (parts.length >= 3) {
              company = parts[parts.length - 2] || 'beBee Partner';
              location = parts[parts.length - 1] || 'Brasil';
            }
          }

          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company,
            platform: PlatformSource.BEBEE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
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
