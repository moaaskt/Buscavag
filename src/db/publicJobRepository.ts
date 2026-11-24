import { db, initDatabase } from './index';
import {
  buildPublicJobSlug,
  formatPlatformLabel,
  formatRelativePublishedAtPtBr,
  getSafeExternalJobUrl,
  normalizeOptionalJobField,
} from '../utils/publicJobFormatters';

export interface PublicJobItem {
  id: string;
  slug: string;
  url: string;
  safeUrl: string | null;
  title: string;
  company: string;
  platform: string;
  platformLabel: string;
  location: string | null;
  city: string | null;
  state: string | null;
  workModel: string | null;
  requiredSeniority: string | null;
  salary: string | null;
  category: string | null;
  techStack: string[];
  publishedAt: string;
  createdAt: string;
  publishedAtLabel: string;
}

export interface PublicJobSearchParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface PublicJobPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

export interface PublicJobSearchResult {
  jobs: PublicJobItem[];
  pagination: PublicJobPagination;
}

interface PublicJobRow {
  id: string;
  url: string;
  title: string;
  company: string;
  platform: string;
  location: string | null;
  city: string | null;
  state: string | null;
  work_model: string | null;
  required_seniority: string | null;
  salary: string | null;
  category: string | null;
  tech_stack: string | null;
  published_at: string;
  created_at: string;
}

function parseTechStack(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      );
    }
    return [];
  } catch {
    return [];
  }
}

function escapeSqlLikeTerm(term: string): string {
  return term
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export class PublicJobRepository {
  constructor() {
    initDatabase();
  }

  public searchPublicJobs(params: PublicJobSearchParams = {}): PublicJobSearchResult {
    const limit = Math.min(30, Math.max(1, Math.trunc(Number(params.limit) || 24)));
    const page = Math.max(1, Math.trunc(Number(params.page) || 1));
    const offset = (page - 1) * limit;
    const q = (params.q ?? '').trim().slice(0, 120);

    const whereClauses: string[] = [
      "(status IS NULL OR status = 'active')",
      'is_tech_software = 1',
      "LOWER(platform) != 'bebee'",
    ];
    const queryParams: Array<string | number> = [];

    if (q.length > 0) {
      const escapedQ = escapeSqlLikeTerm(q);
      const pattern = `%${escapedQ}%`;
      whereClauses.push(
        "(title LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR tech_stack LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')"
      );
      queryParams.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = whereClauses.join(' AND ');
    const cteSql = `
      WITH eligible AS (
        SELECT
          id, url, title, company, platform, location, city, state,
          work_model, required_seniority, salary, category, tech_stack,
          published_at, created_at,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(NULLIF(TRIM(fingerprint), ''), id)
            ORDER BY published_at DESC, created_at DESC, id ASC
          ) AS rn
        FROM jobs
        WHERE ${whereSql}
      )
    `;

    const countRow = db
      .prepare(
        `
        ${cteSql}
        SELECT COUNT(*) AS totalCount
        FROM eligible
        WHERE rn = 1
      `
      )
      .get(...queryParams) as { totalCount: number } | undefined;

    const totalCount = countRow?.totalCount ?? 0;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);

    const rows = db
      .prepare(
        `
        ${cteSql}
        SELECT
          id, url, title, company, platform, location, city, state,
          work_model, required_seniority, salary, category, tech_stack,
          published_at, created_at
        FROM eligible
        WHERE rn = 1
        ORDER BY published_at DESC, created_at DESC, id ASC
        LIMIT ? OFFSET ?
      `
      )
      .all(...queryParams, limit, offset) as PublicJobRow[];

    const jobs: PublicJobItem[] = rows.map((row) => {
      const safeUrl = getSafeExternalJobUrl(row.url);

      return {
        id: row.id,
        slug: buildPublicJobSlug(row.title, row.id),
        url: safeUrl ? row.url : '',
        safeUrl,
        title: row.title,
        company: row.company,
        platform: row.platform,
        platformLabel: formatPlatformLabel(row.platform),
        location: normalizeOptionalJobField(row.location),
        city: normalizeOptionalJobField(row.city),
        state: normalizeOptionalJobField(row.state),
        workModel: normalizeOptionalJobField(row.work_model),
        requiredSeniority: normalizeOptionalJobField(row.required_seniority),
        salary: normalizeOptionalJobField(row.salary),
        category: normalizeOptionalJobField(row.category),
        techStack: parseTechStack(row.tech_stack),
        publishedAt: row.published_at,
        createdAt: row.created_at,
        publishedAtLabel: formatRelativePublishedAtPtBr(row.published_at, row.created_at),
      };
    });

    return {
      jobs,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
    };
  }
}
