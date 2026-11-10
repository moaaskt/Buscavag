import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { RawJob } from '../types/job.js';
import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';

import { PythonBridgeClient } from '../services/pythonBridge.js';

export interface JobScraper {
  name: string;
  requiresPython?: boolean;
  pythonSourceName?: string;
  timeoutMs?: number;
  scrape(): Promise<RawJob[]>;
}

export abstract class PythonBridgeScraper implements JobScraper {
  abstract name: string;
  requiresPython = true;
  pythonSourceName?: string;

  protected bridge: PythonBridgeClient;

  constructor(bridge?: PythonBridgeClient) {
    this.bridge = bridge || new PythonBridgeClient();
  }

  async scrape(): Promise<RawJob[]> {
    const sourceKey = this.pythonSourceName || this.name.toLowerCase();
    return this.bridge.scrape(sourceKey);
  }
}


export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function fetchHtml(url: string, config?: AxiosRequestConfig): Promise<string> {
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const response = await axios.get(url, {
    httpsAgent: insecureAgent,
    headers: {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      ...(config?.headers || {}),
    },
    timeout: 15000,
    ...config,
  });
  return response.data;
}

export async function createStealthContext(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ],
  });

  const context = await browser.newContext({
    userAgent: randomUserAgent,
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });

  const page = await context.newPage();

  // Ocultar webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  return { browser, context, page };
}
