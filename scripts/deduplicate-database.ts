import Database from 'better-sqlite3';
import path from 'path';
import { generateJobFingerprint } from '../src/utils/fingerprint.js';
import { parseCanonicalLocation } from '../src/utils/geoParser.js';

const dbPath = path.resolve(process.cwd(), 'buscavag.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('\n======================================================');
console.log('  BUSCAVAG - HIGIENIZADOR DE DUPLICATAS DO BANCO DE DADOS');
console.log('======================================================\n');

// 1. Recalcular e atualizar fingerprints canônicos em toda a base
console.log('1. Recalculando e harmonizando fingerprints canônicos...');
const allJobs = db.prepare('SELECT id, title, company, platform, location, description, fingerprint FROM jobs').all() as any[];

const updateFpStmt = db.prepare('UPDATE jobs SET fingerprint = ? WHERE id = ?');
let updatedFpCount = 0;

for (const job of allJobs) {
  const canonicalGeo = parseCanonicalLocation(job.location, job.platform, job.title, job.description);
  const loc = canonicalGeo.canonicalLocation || job.location || null;
  const canonicalFp = generateJobFingerprint(job.title, job.company, loc);

  if (canonicalFp && canonicalFp !== job.fingerprint) {
    updateFpStmt.run(canonicalFp, job.id);
    updatedFpCount++;
  }
}
console.log(`✅ ${updatedFpCount} registros tiveram seu fingerprint atualizado para o padrão canônico.\n`);

// 2. Identificar grupos de duplicatas por fingerprint
console.log('2. Buscando ocorrências duplicadas no banco...');
const dupGroups = db.prepare(`
  SELECT fingerprint, COUNT(*) as count, GROUP_CONCAT(id) as id_list
  FROM jobs
  WHERE fingerprint IS NOT NULL AND fingerprint != ''
  GROUP BY fingerprint
  HAVING count > 1
`).all() as any[];

console.log(`🔎 Total de grupos com duplicatas encontrados: ${dupGroups.length}`);

let totalDeleted = 0;
const deleteJobStmt = db.prepare('DELETE FROM jobs WHERE id = ?');
const checkSavedStmt = db.prepare('SELECT user_id FROM user_saved_jobs WHERE job_id = ?');
const checkHiddenStmt = db.prepare('SELECT user_id FROM user_hidden_jobs WHERE job_id = ?');
const reassignSavedStmt = db.prepare("INSERT OR IGNORE INTO user_saved_jobs (user_id, job_id, status, created_at) VALUES (?, ?, 'saved', ?)");
const reassignHiddenStmt = db.prepare('INSERT OR IGNORE INTO user_hidden_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)');

for (const group of dupGroups) {
  const ids = group.id_list.split(',');
  const placeholders = ids.map(() => '?').join(',');
  const jobsInGroup = db.prepare(`SELECT * FROM jobs WHERE id IN (${placeholders})`).all(...ids) as any[];

  // Ordenação para escolher a MELHOR vaga para manter:
  // 1. Interação humana (application_status diferente de 'pending')
  // 2. Vaga ativa sobre arquivada
  // 3. Maior score geral
  // 4. Data de criação mais antiga
  jobsInGroup.sort((a, b) => {
    const aInteracted = a.application_status !== 'pending' ? 1 : 0;
    const bInteracted = b.application_status !== 'pending' ? 1 : 0;
    if (bInteracted !== aInteracted) return bInteracted - aInteracted;

    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const scoreDiff = (b.overall_score || 0) - (a.overall_score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const keepJob = jobsInGroup[0];
  const duplicates = jobsInGroup.slice(1);

  console.log(`👉 Mantendo: "${keepJob.title}" | ${keepJob.company} (ID: ${keepJob.id.slice(0, 10)}... | Status: ${keepJob.application_status})`);
  console.log(`   Removendo ${duplicates.length} cópia(s) repetida(s)...`);

  for (const dup of duplicates) {
    // Reatribuir eventuais saves/hides do usuário para o job mantido
    const saved = checkSavedStmt.all(dup.id) as any[];
    for (const s of saved) {
      reassignSavedStmt.run(s.user_id, keepJob.id, new Date().toISOString());
    }

    const hidden = checkHiddenStmt.all(dup.id) as any[];
    for (const h of hidden) {
      reassignHiddenStmt.run(h.user_id, keepJob.id, new Date().toISOString());
    }

    deleteJobStmt.run(dup.id);
    totalDeleted++;
  }
}

// 3. Verificação de sanidade pós-limpeza
const remainingDups = db.prepare(`
  SELECT fingerprint, COUNT(*) as count
  FROM jobs
  WHERE fingerprint IS NOT NULL AND fingerprint != ''
  GROUP BY fingerprint
  HAVING count > 1
`).all();

const totalRemainingJobs = (db.prepare('SELECT COUNT(*) as count FROM jobs').get() as any).count;

console.log('\n======================================================');
console.log('  RELATÓRIO FINAL DE HIGIENIZAÇÃO');
console.log('======================================================');
console.log(`🗑️ Total de vagas duplicadas removidas: ${totalDeleted}`);
console.log(`✅ Duplicatas restantes no banco:        ${remainingDups.length}`);
console.log(`📊 Total de vagas únicas ativas no DB:   ${totalRemainingJobs}`);
console.log('======================================================\n');
