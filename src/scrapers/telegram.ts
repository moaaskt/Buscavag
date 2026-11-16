import axios from 'axios';
import * as cheerio from 'cheerio';
import { JobScraper } from './base.js';
import { PlatformSource, RawJob } from '../types/job.js';
import { cleanJobTitle } from '../config/jobFilters.js';

export class TelegramScraper implements JobScraper {
  name = 'Telegram Channels';

  private targetChannels = ['vagasprogramacao', 'vagasremotas', 'remoteok'];

  async scrape(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();

    for (const channel of this.targetChannels) {
      try {
        const url = `https://t.me/s/${channel}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);

        $('.tgme_widget_message_wrap').each((_, el) => {
          const textEl = $(el).find('.tgme_widget_message_text');
          const text = textEl.text().trim();
          if (!text || text.length < 15) return;

          const lower = text.toLowerCase();
          const isTech =
            lower.includes('desenvolvedor') ||
            lower.includes('developer') ||
            lower.includes('programador') ||
            lower.includes('software') ||
            lower.includes('engineer') ||
            lower.includes('frontend') ||
            lower.includes('backend') ||
            lower.includes('fullstack') ||
            lower.includes('analyst') ||
            lower.includes('analista') ||
            lower.includes('vaga') ||
            lower.includes('remoto');

          if (!isTech) return;

          const dateStr = $(el).find('time.tgme_widget_message_date').attr('datetime');
          const publishedAt = dateStr ? new Date(dateStr) : new Date();

          const linkEl = $(el).find('a.tgme_widget_message_date');
          const msgUrl = linkEl.attr('href') || `https://t.me/s/${channel}`;
          if (seenUrls.has(msgUrl)) return;
          seenUrls.add(msgUrl);

          // Extrair título legível
          const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
          let rawTitle = lines.find((l) => !l.startsWith('http')) || lines[0] || 'Oportunidade Tech no Telegram';
          if (rawTitle.startsWith('http')) {
            const urlMatch = rawTitle.match(/\/jobs\/([a-zA-Z0-9_-]+)/) || rawTitle.match(/\/view\/([a-zA-Z0-9_-]+)/);
            if (urlMatch) {
              rawTitle = urlMatch[1].replace(/-/g, ' ');
            }
          }

          const title = cleanJobTitle(rawTitle.length > 80 ? rawTitle.substring(0, 80) + '...' : rawTitle);

          jobs.push({
            title,
            company: `@${channel}`,
            platform: PlatformSource.TELEGRAM,
            url: msgUrl,
            description: text.substring(0, 300),
            publishedAt,
            location: 'Remoto / Telegram',
          });
        });
      } catch (err) {
        console.warn(`[TelegramScraper] Erro ao raspar canal @${channel}:`, (err as Error).message);
      }
    }

    return jobs;
  }
}
