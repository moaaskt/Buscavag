import axios from 'axios';
import { JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class QuickinScraper implements JobScraper {
  name = 'Quickin ATS';

  private targetCompanies = ['anarecrutamento'];

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    for (const company of this.targetCompanies) {
      try {
        const url = `https://api.quickin.io/public/careersites/${company}/jobs?sort=-created_at&limit=30&page=1`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          },
          timeout: 10000,
        });

        const docs = response.data?.docs || [];
        for (const item of docs) {
          const rawTitle = item.title?.trim();
          if (!rawTitle) continue;

          const title = cleanJobTitle(rawTitle);
          const jobUrl = item.career_url || (item._id ? `https://jobs.quickin.io/${company}/jobs/${item._id}` : '');
          if (!jobUrl) continue;

          const publishedAt = item.created_at ? new Date(item.created_at) : new Date();

          let location = 'Brasil';
          if (item.workplace_type === 'remote') {
            location = 'Remoto';
          } else if (item.city) {
            location = item.region ? `${item.city} - ${item.region}` : item.city;
          }

          const description = item.description?.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 300) || `${title} - Quickin (${location})`;

          jobs.push({
            title,
            company: 'Ana Recrutamento / Quickin',
            platform: PlatformSource.QUICKIN,
            url: jobUrl,
            description,
            publishedAt,
            location,
          });
        }
      } catch (err) {
        console.warn(`[QuickinScraper] Erro ao buscar vagas da empresa "${company}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
