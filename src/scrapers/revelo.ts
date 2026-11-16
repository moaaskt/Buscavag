import { fetchHtml, createStealthContext, JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class ReveloScraper implements JobScraper {
  name = 'Revelo';

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = 'https://app.careers.revelo.com/home';
    const { browser, context, page } = await createStealthContext();

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      // Checagem se caiu na tela de autenticação obrigatória de candidatos
      const bodyText = (await page.innerText('body')).toLowerCase();
      if (bodyText.includes('log in to your account') || bodyText.includes('sign in with apple') || bodyText.includes('sign up')) {
        console.info('[ReveloScraper] ℹ️ Revelo opera em modelo de matching reverso fechado e requer login de candidato. Pulando com segurança.');
        return [];
      }

      const cards = await page.$$('.job-card, .opportunity-card, [data-testid="job-card"], article');
      for (const card of cards) {
        try {
          const titleEl = await card.$('h2 a, h3 a, .job-title, a[href*="/jobs/"], a[href*="/vaga/"]');
          const companyEl = await card.$('.company-name, .company');
          const locationEl = await card.$('.location, .cidade');

          const rawTitle = titleEl ? (await titleEl.innerText()).trim() : '';
          const href = titleEl ? await titleEl.getAttribute('href') : '';
          const company = companyEl ? (await companyEl.innerText()).trim() : 'Revelo Partner';
          const location = locationEl ? (await locationEl.innerText()).trim() : 'Remoto / Brasil';

          if (!rawTitle || !href) continue;

          const title = cleanJobTitle(rawTitle);
          const fullUrl = href.startsWith('http') ? href : `https://app.careers.revelo.com${href.startsWith('/') ? '' : '/'}${href}`;

          jobs.push({
            title,
            company,
            platform: PlatformSource.REVELO,
            url: fullUrl,
            description: `${title} - ${company} (${location})`,
            publishedAt: new Date(),
            location,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[ReveloScraper] Aviso de execução:', (err as Error).message);
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }

    return jobs;
  }
}
