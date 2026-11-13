import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      code: 'COMMERCIAL_DECOMMISSIONED',
      mode: 'personal_workspace',
      message: 'O catálogo comercial de planos foi descontinuado. O Buscavag opera como Personal Workspace irrestrito e gratuito.',
      plans: [],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  );
}
