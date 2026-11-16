import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class SaoJoseScraper implements JobScraper {
  name = 'São José Mais Empregos';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchSlugs = ['', '?busca=desenvolvedor', '?busca=tecnologia', '?busca=programador'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://saojosemaisempregos.empregaja.org/oportunidades${slug}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('a.card-oportunidade, a[href*="/oportunidade/"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (!href || href === '/oportunidades') return;

          const fullUrl = href.startsWith('http') ? href : `https://saojosemaisempregos.empregaja.org${href.startsWith('/') ? '' : '/'}${href}`;
          if (seenUrls.has(fullUrl)) return;

          const titleEl = $(el).find('.text_body_b3_bold, h2, h3').first();
          let rawTitle = titleEl.text().trim();
          if (!rawTitle) {
            const imgAlt = $(el).find('img.card-img').attr('alt') || '';
            rawTitle = imgAlt.replace(/^oportunidade\s+/i, '').trim();
          }
          if (!rawTitle) return;

          const title = cleanJobTitle(rawTitle);

          // Empresa: p com o ícone company.svg
          const companyEl = $(el).find('img[src*="company.svg"]').parent();
          const company = companyEl.text().trim() || $(el).find('img[src*="company.svg"]').attr('alt') || 'São José Mais Empregos';

          // Localização
          const locationEl = $(el).find('img[src*="location.svg"]').parent();
          const location = locationEl.text().trim() || 'São José / SC';

          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company,
            platform: PlatformSource.SAO_JOSE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
            location,
          });
        });
      } catch (err) {
        console.warn(`[SaoJoseScraper] Aviso ao buscar "${slug}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
