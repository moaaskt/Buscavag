import { spawnSync } from 'child_process';
import path from 'path';

interface TestSuite {
  id: string;
  name: string;
  file: string;
  description: string;
}

interface TestResult {
  suite: TestSuite;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  errorOutput?: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    id: 'phase1',
    name: 'Core Base DB',
    file: 'src/test-phase1.ts',
    description: 'Tabelas SQLite, inserção e consulta do repositório',
  },
  {
    id: 'phase8',
    name: 'Kanban & Analytics',
    file: 'src/test-phase8.ts',
    description: 'Gestão de status do Kanban e métricas analíticas',
  },
  {
    id: 'candidate-auth',
    name: 'Candidate Auth',
    file: 'src/test-candidate-auth.ts',
    description: 'Hashing scrypt, tokens HMAC e sessão de candidatos',
  },
  {
    id: 'rbac',
    name: 'RBAC Control',
    file: 'src/test-rbac.ts',
    description: 'Controle de acesso por papel (CANDIDATE vs ADMIN)',
  },
  {
    id: 'session-isolation',
    name: 'Multi-Tenant Isolation',
    file: 'src/test-session-isolation.ts',
    description: 'Isolamento de sessão e proteção de estado zero GUEST',
  },
  {
    id: 'phase67',
    name: 'Kanban Inbox',
    file: 'src/test-phase67.ts',
    description: 'Ordenação da Inbox e regra de descarte na ingestão',
  },
  {
    id: 'phase68',
    name: 'Agnostic Parser',
    file: 'src/test-phase68.ts',
    description: 'Parser neutro Hermes e ingestão multi-tenant global',
  },
  {
    id: 'phase69',
    name: 'Pitch Dinâmico',
    file: 'src/test-phase69.ts',
    description: 'Pitch contextualizado com proteção anti-alucinação',
  },
  {
    id: 'phase70',
    name: 'Security & Resilience',
    file: 'src/test-phase70.ts',
    description: 'AUTH_SECRET estrito, lock concorrente e cooldown de CV',
  },
  {
    id: 'antinoise-filters',
    name: 'Anti-Noise & CNC Guard',
    file: 'src/test-job-filters-antinoise.ts',
    description: 'Blindagem anti-ruído para vagas não-tech, usinagem/CNC e sanitização de botões',
  },
];

export function runAllSuites(suites: TestSuite[] = TEST_SUITES): { results: TestResult[]; allPassed: boolean } {
  console.log('\n======================================================');
  console.log('  🚀 BUSCAVAG - UNIFIED TEST RUNNER (Milestone v18.0)');
  console.log(`  Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`  Total de Suítes Orquestradas: ${suites.length}`);
  console.log('======================================================\n');

  const results: TestResult[] = [];
  const totalStartTime = Date.now();

  for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    const suiteNum = `[${i + 1}/${suites.length}]`;
    process.stdout.write(`⏳ Executando ${suiteNum} ${suite.name} (${suite.file})... `);

    const startTime = Date.now();
    const child = spawnSync('npx', ['tsx', suite.file], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    const durationMs = Date.now() - startTime;

    const exitCode = child.status ?? (child.error ? 1 : 0);
    const passed = exitCode === 0;

    if (passed) {
      console.log(`✅ PASS (${durationMs}ms)`);
    } else {
      console.log(`❌ FAIL (${durationMs}ms, exit code: ${exitCode})`);
    }

    results.push({
      suite,
      passed,
      exitCode,
      durationMs,
      errorOutput: passed ? undefined : child.stderr || child.stdout,
    });
  }

  const totalDuration = Date.now() - totalStartTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const allPassed = failedCount === 0;

  console.log('\n======================================================');
  console.log('  📊 RELATÓRIO CONSOLIDADO DE EXECUÇÃO');
  console.log('======================================================');
  console.log('SUÍTE                     DURAÇÃO    STATUS   DESCRIÇÃO');
  console.log('------------------------------------------------------');

  for (const res of results) {
    const statusIcon = res.passed ? '✅ PASS' : '❌ FAIL';
    const paddedName = res.suite.name.padEnd(25, ' ');
    const paddedDuration = `${res.durationMs}ms`.padStart(8, ' ');
    console.log(`${paddedName} ${paddedDuration}   ${statusIcon}  ${res.suite.description}`);
  }

  console.log('------------------------------------------------------');
  console.log(`Total: ${suites.length} | Aprovadas: ${passedCount} | Falhas: ${failedCount} | Tempo Total: ${(totalDuration / 1000).toFixed(2)}s\n`);

  if (!allPassed) {
    console.error('🚨 [FALHA DETECTADA] Uma ou mais suítes de testes falharam:');
    for (const res of results) {
      if (!res.passed) {
        console.error(`\n--- Falha na suíte: ${res.suite.name} (${res.suite.file}) ---`);
        console.error(res.errorOutput || 'Nenhuma saída de erro capturada.');
      }
    }
  } else {
    console.log('🎉 TODAS AS SUÍTES DO BUSCAVAG PASSARAM COM 100% DE SUCESSO!\n');
  }

  return { results, allPassed };
}

// Execução direta do runner via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { allPassed } = runAllSuites();
  process.exit(allPassed ? 0 : 1);
}
