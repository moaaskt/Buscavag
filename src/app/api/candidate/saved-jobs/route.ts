import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { CandidateRepository } from '@/db/candidateRepository';

const toggleSchema = z.object({
  jobId: z.string().min(1, 'ID da vaga é obrigatório'),
  status: z.string().default('saved'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const repo = new CandidateRepository();
    const savedJobs = repo.getSavedJobs(session.userId);

    return NextResponse.json({ success: true, savedJobs });
  } catch (error) {
    console.error('Error in GET /api/candidate/saved-jobs:', error);
    return NextResponse.json({ error: 'Erro ao buscar vagas salvas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = toggleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.format() }, { status: 400 });
    }

    const repo = new CandidateRepository();
    const result = repo.toggleSavedJob(session.userId, parsed.data.jobId, parsed.data.status);

    return NextResponse.json({
      success: true,
      isSaved: result.isSaved,
      status: result.status,
    });
  } catch (error) {
    console.error('Error in POST /api/candidate/saved-jobs:', error);
    return NextResponse.json({ error: 'Erro ao salvar/remover vaga' }, { status: 500 });
  }
}
