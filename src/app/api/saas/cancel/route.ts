import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      code: 'COMMERCIAL_DECOMMISSIONED',
      mode: 'personal_workspace',
      message: 'Operações de cancelamento foram descontinuadas. Não existem cobranças nem planos ativos no Personal Workspace.',
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}
