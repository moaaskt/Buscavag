import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      code: 'COMMERCIAL_DECOMMISSIONED',
      mode: 'personal_workspace',
      message: 'Operações de upgrade comercial foram descontinuadas. Todos os recursos do Personal Workspace já estão ativos para todos os usuários.',
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}
