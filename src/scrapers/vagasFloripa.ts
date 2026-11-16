import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class VagasFloripaScraper implements JobScraper {
  name = 'Vagas Floripa';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchQueries = ['desenvolvedor', 'programador', 'full stack', 'software'];

    for (const q of searchQueries) {
      try {
        const url = `https://www.vagasfloripa.com.br/?post_type=job_listing&s=${encodeURIComponent(q)}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.job_listing, li.job_listing, article.job_listing').each((_, el) => {
          const linkEl = $(el).find('a[href*="/vagas/"]').first();
          const href = linkEl.attr('href') || $(el).find('a').attr('href') || '';
          if (!href || seenUrls.has(href)) return;

          const titleEl = $(el).find('h3, h2, .job_listing-title').first();
          const rawTitle = titleEl.text().trim() || linkEl.text().trim();
          if (!rawTitle) return;

          const title = cleanJobTitle(rawTitle);
          const company = $(el).find('.company, .employer, [class*="company"]').first().text().trim() || 'Vagas Floripa';
          const location = $(el).find('.location, [class*="location"]').first().text().trim() || 'Florianópolis / SC';
          const excerpt = $(el).text().replace(/\s+/g, ' ').substring(0, 200);

          seenUrls.add(href);
          jobs.push({
            title,
            company,
            platform: PlatformSource.VAGAS_FLORIPA,
            url: href.startsWith('http') ? href : `https://www.vagasfloripa.com.br${href}`,
            description: excerpt ? `${title} - ${excerpt}` : title,
            publishedAt: new Date(),
            location,
          });
        });
      } catch (err) {
        console.warn(`[VagasFloripaScraper] Aviso ao buscar "${q}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
