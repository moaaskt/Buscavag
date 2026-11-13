import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { CandidateRepository } from '@/db/candidateRepository';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

const RegisterSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const repo = new CandidateRepository();

    const existing = repo.getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Este e-mail já está cadastrado. Faça login para continuar.' },
        { status: 409 }
      );
    }

    const password_hash = hashPassword(password);
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    const user = repo.createUser({
      id: userId,
      email,
      name,
      password_hash,
      tier: 'premium',
    });

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return response;
  } catch (err) {
    console.error('[Register error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar cadastro' },
      { status: 500 }
    );
  }
}
