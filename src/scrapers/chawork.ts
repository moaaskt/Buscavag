import * as cheerio from 'cheerio';
import { fetchHtml, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { parseRelativeDate, isOlderThanDays } from '../utils/date.js';

export class ChaworkScraper implements JobScraper {
  name = 'Chawork';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();
    // Chawork bloqueia ou retorna 404 em rotas com barra final (/vagas/). A URL correta é /vagas sem barra.
    const searchSlugs = ['tecnologia', 'desenvolvedor', 'programador', 'sistemas', ''];

    for (const slug of searchSlugs) {
      try {
        const url = slug
          ? `https://chawork.com.br/vagas?q=${encodeURIComponent(slug)}`
          : 'https://chawork.com.br/vagas';

        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.job-item, .job-card, .vaga-card, article').each((_, el) => {
          const titleEl = $(el).find('.job-item-title, h2, h3, .job-title, .title');
          const companyEl = $(el).find('.company, .empresa, .job-company, .job-item-company');
          const locationEl = $(el).find('.job-item-location, .location, .cidade');
          const descEl = $(el).find('.job-item-description, p');
          const dateEl = $(el).find('.job-item-posted-at, time, .date, .data');
          const linkEl = $(el).find('a[href*="vaga"], a.btn, a[href*="/vaga-"]').first();

          const title = titleEl.text().trim();
          let href = linkEl.attr('href') || '';
          if (!title || !href) return;

          const fullUrl = href.startsWith('http')
            ? href
            : `https://chawork.com.br${href.startsWith('/') ? '' : '/'}${href}`;

          if (seenUrls.has(fullUrl)) return;
          seenUrls.add(fullUrl);

          const company = companyEl.text().trim() || 'Chawork Partner';
          const location = locationEl.text().replace(/\s+/g, ' ').trim() || 'Brasil';
          const descText = descEl.text().replace(/\s+/g, ' ').trim();
          const description = descText ? `${title} - ${descText} (${location})` : `${title} - ${company} (${location})`;
          const dateStr = dateEl.text().trim();

          const publishedAt = parseRelativeDate(dateStr);
          if (isOlderThanDays(publishedAt, 15)) return;

          jobs.push({
            title,
            company,
            platform: PlatformSource.CHAWORK,
            url: fullUrl,
            description,
            publishedAt,
            location,
          });
        });
      } catch (err) {
        console.warn(`[ChaworkScraper] Aviso ao buscar "${slug || 'geral'}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
