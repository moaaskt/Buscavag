import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PublicJobRepository } from '@/db/publicJobRepository';

export const dynamic = 'force-dynamic';

const PublicJobsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, 'Termo de busca deve ter no máximo 120 caracteres')
    .optional()
    .default(''),
  page: z.coerce
    .number()
    .int('Página deve ser um número inteiro')
    .min(1, 'Página deve ser maior ou igual a 1')
    .optional()
    .default(1),
  limit: z.coerce
    .number()
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser maior ou igual a 1')
    .max(30, 'Limite máximo permitido é 30 vagas por página')
    .optional()
    .default(24),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = PublicJobsQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Parâmetros de busca inválidos',
        },
        { status: 400 }
      );
    }

    const repo = new PublicJobRepository();
    const result = repo.searchPublicJobs(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.jobs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[API /api/public/jobs GET error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao consultar catálogo público de vagas',
      },
      { status: 500 }
    );
  }
}
