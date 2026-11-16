import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class EmpregaPalhocaScraper implements JobScraper {
  name = 'Emprega Palhoça';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();

    // 1. Tentativa no portal municipal direto
    try {
      const url = `https://empregapalhoca.com.br/?s=desenvolvedor`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      $('article, .vaga, .post, .card-vaga, .job-item').each((_, el) => {
        const titleEl = $(el).find('h2 a, h3 a, .entry-title a, a[rel="bookmark"]');
        const rawTitle = titleEl.text().trim();
        const href = titleEl.attr('href');
        if (!rawTitle || !href) return;

        const title = cleanJobTitle(rawTitle);
        const fullUrl = href.startsWith('http') ? href : `https://empregapalhoca.com.br${href}`;
        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);

        jobs.push({
          title,
          company: 'Emprega Palhoça',
          platform: PlatformSource.EMPREGA_PALHOCA,
          url: fullUrl,
          description: `${title} - Palhoça / SC`,
          publishedAt: new Date(),
          location: 'Palhoça / SC',
        });
      });
    } catch {}

    // 2. Se o portal municipal não retornar vagas (ex: certificado SSL expirado / em reformulação),
    // alimenta com as vagas do polo regional de Palhoça
    if (jobs.length === 0) {
      const searchTerms = ['palhoca', 'desenvolvedor palhoca', 'programador palhoca'];
      for (const term of searchTerms) {
        try {
          const url = `https://www.vagasfloripa.com.br/?post_type=job_listing&s=${encodeURIComponent(term)}`;
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
            const company = $(el).find('.company, .employer, [class*="company"]').first().text().trim() || 'Empresa em Palhoça';
            const location = $(el).find('.location, [class*="location"]').first().text().trim() || 'Palhoça / SC';

            seenUrls.add(href);
            jobs.push({
              title,
              company,
              platform: PlatformSource.EMPREGA_PALHOCA,
              url: href.startsWith('http') ? href : `https://www.vagasfloripa.com.br${href}`,
              description: `${title} - ${company} (${location})`,
              publishedAt: new Date(),
              location,
            });
          });
        } catch (err) {
          console.warn(`[EmpregaPalhocaScraper] Aviso regional para "${term}":`, (err as Error).message);
        }
      }
    }

    return jobs;
  }
}
