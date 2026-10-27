import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { RawJob, PlatformSource } from '../types/job.js';

export interface PythonScrapeOptions {
  query?: string;
  location?: string;
  limit?: number;
  options?: Record<string, any>;
}

export interface PythonScrapeResponse {
  success: boolean;
  source: string;
  count: number;
  jobs: Array<{
    id?: string;
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    description?: string;
    publishedAt?: string;
    salary?: string;
    workModel?: string;
    extra?: Record<string, any>;
  }>;
  error?: string;
  executionTimeMs?: number;
}

export interface PythonCVAnalysisData {
  detected_role: string;
  detected_seniority: string;
  hard_skills: string[];
  soft_skills: string[];
  primary_stack: string[];
  secondary_stack: string[];
  work_model: string | null;
  expected_salary: string | null;
  summary: string;
  strengths: string[];
  improvement_tips: string[];
  source?: string;
}

export interface PythonCVAnalyzeResponse {
  success: boolean;
  analysis?: PythonCVAnalysisData;
  rawTextPreview?: string;
  wordCount?: number;
  error?: string;
  executionTimeMs?: number;
}

export interface PythonCVParseResponse {
  success: boolean;
  text: string;
  wordCount: number;
  charCount: number;
  detectedSections: string[];
  preview: string;
  error?: string;
  executionTimeMs?: number;
}

export class PythonBridgeClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.SCRAPLING_ENGINE_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verifica se o microserviço Python Scrapling Engine está online e saudável.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.status === 200 && (response.data?.status === 'healthy' || response.data?.status === 'ok');
    } catch {
      return false;
    }
  }

  /**
   * Dispara a raspagem de uma fonte no microserviço Python.
   */
  async scrape(source: string, options?: PythonScrapeOptions): Promise<RawJob[]> {
    try {
      const response = await this.client.post<PythonScrapeResponse>('/scrape', {
        source,
        query: options?.query || 'desenvolvedor',
        location: options?.location,
        limit: options?.limit || 30,
        options: options?.options || {},
      });

      if (!response.data.success || !response.data.jobs) {
        throw new Error(response.data.error || `Falha desconhecida no Scrapling Engine para fonte ${source}`);
      }

      return response.data.jobs.map((item) => {
        return {
          title: item.title,
          company: item.company,
          location: item.location || 'Brasil / Remoto',
          url: item.url,
          platform: (item.source as PlatformSource) || (source as PlatformSource),
          description: item.description || '',
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        };
      });
    } catch (err) {
      const msg = (err as Error).message || String(err);
      throw new Error(`[PythonBridgeClient] Erro ao consultar ${source}: ${msg}`);
    }
  }

  /**
   * Extrai texto limpo de um arquivo de currículo (PDF/DOCX) via motor Python.
   */
  async parseCV(filePath: string, filename?: string): Promise<PythonCVParseResponse> {
    try {
      let contentBase64: string | undefined = undefined;
      if (filePath && fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          contentBase64 = buffer.toString('base64');
        } catch (readErr) {
          console.warn('[PythonBridgeClient] Falha ao ler buffer para base64:', readErr);
        }
      }

      const response = await this.client.post<PythonCVParseResponse>('/cv/parse', {
        filePath,
        filename,
        contentBase64,
      });
      return response.data;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      throw new Error(`[PythonBridgeClient] Erro ao extrair texto do CV: ${msg}`);
    }
  }

  /**
   * Envia um currículo para análise completa por IA no motor Python.
   */
  async analyzeCV(filePath?: string, cvText?: string, filename?: string): Promise<PythonCVAnalysisData> {
    try {
      let resolvedText = cvText?.trim() || '';

      // Se não há texto pré-extraído, mas há arquivo, extrai texto primeiro via parseCV com base64
      if (!resolvedText && filePath && fs.existsSync(filePath)) {
        try {
          const parsed = await this.parseCV(filePath, filename);
          if (parsed.success && parsed.text && parsed.text.trim()) {
            resolvedText = parsed.text.trim();
          }
        } catch (parseErr) {
          console.warn('[PythonBridgeClient] parseCV falhou antes do analyzeCV:', parseErr);
        }
      }

      const response = await this.client.post<PythonCVAnalyzeResponse>('/cv/analyze', {
        filePath,
        cvText: resolvedText || undefined,
        filename,
      });

      if (!response.data.success || !response.data.analysis) {
        throw new Error(response.data.error || 'Falha ao processar análise do currículo no motor Python');
      }

      return response.data.analysis;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      throw new Error(`[PythonBridgeClient] Erro na análise de IA: ${msg}`);
    }
  }
}

