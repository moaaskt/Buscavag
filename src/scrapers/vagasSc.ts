import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class VagasScScraper implements JobScraper {
  name = 'Vagas SC';
  timeoutMs = 60000;

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchSlugs = ['desenvolvedor', 'programador'];
    const seenUrls = new Set<string>();

    for (const slug of searchSlugs) {
      try {
        const url = `https://vagas.sc/?s=${encodeURIComponent(slug)}`;
        const html = await fetchHtml(url, { timeout: 25000 });
        const $ = cheerio.load(html);

        $('article, .job_listing, li.job-listing, .post').each((_, el) => {
          const titleEl = $(el).find('h2 a, h3 a, .entry-title a, .job-title a, a[rel="bookmark"], a[href*="/vaga/"]').first();
          const rawTitle = titleEl.text().trim();
          let href = titleEl.attr('href') || $(el).find('a[href*="/vaga/"]').attr('href');
          if (!rawTitle || !href || seenUrls.has(href) || href.endsWith('/vagas/')) return;

          const title = cleanJobTitle(rawTitle);
          const fullText = $(el).text().replace(/\s+/g, ' ');

          // Empresa
          const companyEl = $(el).find('.company, .empresa, .job-company');
          let company = companyEl.text().trim();
          if (!company) {
            const matchCompany = fullText.match(/Por\s+[A-Za-z0-9_]+\s*\d{2}\/\d{2}\/\d{4}\s*\d{2}\/\d{2}\/\d{4}\s*([^,–-]+)/i);
            company = matchCompany ? matchCompany[1].trim() : 'Vagas SC';
          }

          let location = 'Santa Catarina';
          if (fullText.toLowerCase().includes('remoto') || fullText.toLowerCase().includes('home office')) {
            location = 'Remoto';
          } else {
            const locMatch = fullText.match(/([A-Za-zÀ-ÖØ-öø-ÿ\s]+ - [A-Z]{2})/);
            if (locMatch) location = locMatch[1];
          }

          // Data
          const dateEl = $(el).find('time, .date, .entry-date, .published');
          const dateStr = dateEl.text().trim() || dateEl.attr('datetime') || '';
          const publishedAt = dateStr ? parseRelativeDate(dateStr) : new Date();

          seenUrls.add(href);
          const fullUrl = href.startsWith('http') ? href : `https://vagas.sc${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.VAGAS_SC,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[VagasScScraper] Aviso ao buscar "${slug}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
