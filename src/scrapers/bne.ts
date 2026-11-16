import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class BneScraper implements JobScraper {
  name = 'BNE';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    const searchSlugs = ['desenvolvedor', 'programador', 'full-stack', 'ti'];

    for (const slug of searchSlugs) {
      try {
        const url = `https://www.bne.com.br/vagas-de-emprego-para-${slug}`;
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.job__card__container, .card--list--vagas, [class*="card--list"]').each((_, el) => {
          const linkEl = $(el).find('a.card__link, h2 a, h3 a, a[href*="/vaga-de-emprego"]').first();
          const href = linkEl.attr('href') || '';
          if (!href) return;

          const fullUrl = href.startsWith('http') ? href : `https://www.bne.com.br${href.startsWith('/') ? '' : '/'}${href}`;
          if (seenUrls.has(fullUrl)) return;

          let rawTitle = linkEl.attr('title') || linkEl.text().trim();
          if (!rawTitle) return;

          // Se o title for "Desenvolvedor em Consolação/MG", extrair título limpo
          let title = cleanJobTitle(rawTitle);
          if (title.toLowerCase().startsWith('vaga de ')) {
            title = title.substring(8).trim();
          }

          const cardText = $(el).text().replace(/\s+/g, ' ');

          let location = 'Brasil';
          const locMatch = cardText.match(/([A-Za-zÀ-ÖØ-öø-ÿ\s]+)\s*\/\s*([A-Z]{2})/);
          if (locMatch) {
            location = `${locMatch[1].trim()} / ${locMatch[2]}`;
          }

          const companyEl = $(el).find('.job__card__company, .empresa, [class*="company"]').first();
          const company = companyEl.text().trim() || 'BNE Empregos';

          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company,
            platform: PlatformSource.BNE,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
            location,
          });
        });
      } catch (err) {
        console.warn(`[BneScraper] Aviso ao buscar "${slug}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
