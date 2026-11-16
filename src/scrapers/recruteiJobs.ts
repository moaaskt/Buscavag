import axios from 'axios';
import { JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class RecruteiJobsScraper implements JobScraper {
  name = 'Recrutei Jobs (PeoplePlan)';

  private targetCompanies = ['PeoplePlan'];

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    for (const company of this.targetCompanies) {
      try {
        const url = `https://api.recrutei.com.br/api/v2/vacancies/per-departments/${company}`;
        const response = await axios.post(
          url,
          {},
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
            },
            timeout: 10000,
          }
        );

        const departments = response.data?.data?.vacancies || [];
        for (const dep of departments) {
          for (const item of dep.items || []) {
            const rawTitle = item.title?.trim();
            if (!rawTitle) continue;

            const title = cleanJobTitle(rawTitle);
            const publicUrl = item.public_link || `https://jobs.recrutei.com.br/${company}/vacancy/${item.id}-${item.slug || ''}`;

            let location = 'Brasil';
            if (item.remote === 1) {
              location = 'Remoto';
            } else if (Array.isArray(item.location) && item.location.length > 0) {
              location = item.location.filter(Boolean).join(' / ');
            }

            const salary = item.salary ? ` (${item.salary})` : '';
            const description = `${title} na empresa ${item.company_name || company} - Departamento: ${item.department || dep.department || 'Geral'}${salary}`;

            jobs.push({
              title,
              company: item.company_name || 'PeoplePlan / Recrutei',
              platform: PlatformSource.RECRUTEI_JOBS,
              url: publicUrl,
              description,
              publishedAt: new Date(),
              location,
            });
          }
        }
      } catch (err) {
        console.warn(`[RecruteiJobsScraper] Aviso ao buscar vagas de "${company}":`, (err as Error).message);
      }
    }

    return jobs;
  }
}
