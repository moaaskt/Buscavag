import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class EmpregosScraper implements JobScraper {
  name = 'Empregos.com.br';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchSlugs = [
      'desenvolvedor',
      'programador',
      'desenvolvedor-junior',
      'desenvolvedor-full-stack',
    ];

    for (const slug of searchSlugs) {
      try {
        const url = `https://www.empregos.com.br/vagas/${slug}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('[class*="cmp-job-card-area-expand"]').each((_, el) => {
          const linkEl = $(el).find('a[href*="/vaga/"]').first();
          const href = linkEl.attr('href') || '';
          if (!href) return;

          const fullUrl = href.startsWith('http') ? href : `https://www.empregos.com.br${href.startsWith('/') ? '' : '/'}${href}`;
          if (seenUrls.has(fullUrl)) return;

          const titleEl = $(el).find('h2').first();
          const rawTitle = titleEl.text().trim();
          if (!rawTitle) return;

          const title = cleanJobTitle(rawTitle);

          // Empresa
          const companyEl = $(el).find('h3 a').first();
          const imgAlt = $(el).find('img[alt*="empresa"]').attr('alt') || '';
          let company = companyEl.text().trim();
          if (!company && imgAlt) {
            company = imgAlt.replace(/^Logo da empresa\s*/i, '').trim();
          }
          if (!company) company = 'Empregos Partner';

          // Localização
          const cardText = $(el).text().replace(/\s+/g, ' ');
          let location = 'Brasil';
          const locMatch = cardText.match(/([A-Za-zÀ-ÖØ-öø-ÿ\s]{3,30}),\s*([A-Z]{2})/);
          if (locMatch) {
            location = `${locMatch[1].trim()}, ${locMatch[2]}`;
          }

          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company,
            platform: PlatformSource.EMPREGOS,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
            location,
          });
        });
      } catch (err) {
        console.warn(`[EmpregosScraper] Aviso ao buscar "${slug}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
