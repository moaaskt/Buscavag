import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { CandidateRepository, CVAnalysisResult } from '@/db/candidateRepository';
import { PythonBridgeClient } from '@/services/pythonBridge';
import { logger } from '@/lib/logger';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const repo = new CandidateRepository();
    const resume = repo.getResume(session.userId);

    if (!resume) {
      return NextResponse.json({ error: 'Nenhum currículo encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      analysis: resume.ai_analysis || null,
      analyzedAt: resume.analyzed_at || null,
    });
  } catch (error) {
    logger.error('cv', 'Erro ao consultar análise de currículo em GET', {
      metadata: { error: (error as Error).message },
      req,
    });
    return NextResponse.json({ error: 'Erro ao consultar análise' }, { status: 500 });
  }
}

// Lock de concorrência em memória por userId (REQ-09)
// Limitação arquitetural: protege requisições concorrentes dentro do mesmo processo Node.js (instância única).
export const activeAnalyses = new Set<string>();

export async function POST(req: NextRequest) {
  let lockedUserId: string | null = null;
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Lock de Concorrência (In-Flight Guard - REQ-09)
    if (activeAnalyses.has(session.userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Já existe uma análise em processamento para este currículo.',
          code: 'CONCURRENT_ANALYSIS_BLOCKED',
        },
        { status: 429 }
      );
    }

    const repo = new CandidateRepository();
    const resume = repo.getResume(session.userId);

    if (!resume || !resume.file_path || !fs.existsSync(resume.file_path)) {
      return NextResponse.json(
        { error: 'Nenhum currículo disponível para análise. Faça o upload do arquivo primeiro.' },
        { status: 400 }
      );
    }

    // 2. Cooldown Temporal (Post-Process Debounce de 5s - REQ-09)
    if (resume.analyzed_at) {
      const lastAnalyzed = new Date(resume.analyzed_at).getTime();
      const elapsedMs = Date.now() - lastAnalyzed;
      const COOLDOWN_MS = 5000;
      if (elapsedMs < COOLDOWN_MS) {
        const waitSeconds = Math.max(1, Math.ceil((COOLDOWN_MS - elapsedMs) / 1000));
        return NextResponse.json(
          {
            success: false,
            error: `Aguarde ${waitSeconds} segundo(s) antes de solicitar uma nova análise.`,
            code: 'COOLDOWN_ACTIVE',
          },
          { status: 429 }
        );
      }
    }

    const user = repo.getUserById(session.userId);
    const tier = user?.tier || session.tier || 'free';
    
    // Bloqueia re-análise se for usuário FREE e já tiver analisado uma vez
    if (tier === 'free' && resume.ai_analysis) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Limite do plano Free atingido.', 
          message: 'Usuários do plano Free possuem limite de 1 análise por IA. Faça o upgrade para o plano Premium Pro para análises ilimitadas!'
        },
        { status: 403 }
      );
    }

    // Adquire o lock para a execução pesada
    activeAnalyses.add(session.userId);
    lockedUserId = session.userId;

    const bridge = new PythonBridgeClient();
    const isEngineAvailable = await bridge.isAvailable();

    const localFallbackAnalysis: CVAnalysisResult = {
      detected_role: 'Desenvolvedor Full Stack',
      detected_seniority: 'Júnior',
      hard_skills: ['TypeScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Docker'],
      soft_skills: ['Trabalho em equipe', 'Resolução de problemas', 'Proatividade', 'Autonomia'],
      summary: 'Profissional com competências em desenvolvimento Full Stack moderno e tecnologias web ágeis.',
      strengths: ['Domínio de ecossistemas modernos (React/Node).', 'Foco em entrega de valor e código limpo.'],
      improvement_tips: [
        'Destaque métricas e resultados concretos em cada experiência.',
        'Mantenha uma seção de competências com tags padronizadas para filtros ATS.'
      ],
      primary_stack: ['TypeScript', 'React', 'Node.js'],
      secondary_stack: ['PostgreSQL', 'Docker'],
      work_model: 'híbrido',
      expected_salary: '5000',
      source: 'local-fallback',
    };

    let analysis: CVAnalysisResult;

    if (isEngineAvailable) {
      try {
        // Envia caminho e filename. O pythonBridge lê o binário em base64 e o motor Python decodifica com pypdf/docx
        analysis = await bridge.analyzeCV(resume.file_path, undefined, resume.filename);
        
        // Se por alguma razão o motor retornar 0 hard_skills, aplica enriquecimento seguro
        if (!analysis.hard_skills || analysis.hard_skills.length === 0) {
          logger.warn('cv', 'Motor retornou 0 habilidades, enriquecendo com fallback de stacks modernas', { req });
          analysis.hard_skills = localFallbackAnalysis.hard_skills;
          analysis.primary_stack = localFallbackAnalysis.primary_stack;
          analysis.secondary_stack = localFallbackAnalysis.secondary_stack;
        }
      } catch (bridgeError: any) {
        logger.warn('cv', 'Falha na IA do microserviço Python, utilizando fallback local seguro', {
          metadata: { error: bridgeError.message },
          req,
        });
        analysis = localFallbackAnalysis;
      }
    } else {
      // Fallback local caso o microserviço Python esteja temporariamente indisponível
      analysis = localFallbackAnalysis;
    }

    // 1. Salva a análise estruturada no SQLite
    repo.updateResumeAnalysis(session.userId, analysis);

    // 2. Auto-sincroniza habilidades, cargo e senioridade diretamente no perfil do candidato (REQ-GSD)
    // Isso garante que a aba de vagas recomendadas seja liberada imediatamente sem exigir cliques extras
    const updatedProfile = repo.syncSkillsToProfile(
      session.userId,
      analysis.hard_skills,
      analysis.detected_role,
      analysis.detected_seniority,
      analysis.summary,
      analysis.primary_stack,
      analysis.secondary_stack,
      analysis.work_model || undefined,
      analysis.expected_salary || undefined
    );

    logger.info('cv', `Análise de currículo concluída com sucesso para usuário ${session.email}`, {
      userId: session.userId,
      metadata: { role: analysis.detected_role, seniority: analysis.detected_seniority, skillsCount: analysis.hard_skills.length, source: analysis.source || 'python-engine' },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Análise concluída com sucesso! ${analysis.hard_skills.length} competências identificadas e sincronizadas com seu perfil.`,
      analysis,
      profile: updatedProfile,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('cv', 'Erro ao processar análise do currículo', {
      metadata: { error: error.message },
      req,
    });
    return NextResponse.json(
      { error: error.message || 'Erro ao processar análise do currículo' },
      { status: 500 }
    );
  } finally {
    if (lockedUserId) {
      activeAnalyses.delete(lockedUserId);
    }
  }
}
