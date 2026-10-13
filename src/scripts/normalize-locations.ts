import { db, initDatabase } from '../db/index';
import { parseCanonicalLocation } from '../utils/geoParser';
import { generateJobFingerprint } from '../utils/fingerprint';

export interface NormalizationStats {
  totalAnalyzed: number;
  updatedCount: number;
  withCity: number;
  withState: number;
  remoteCount: number;
  fingerprintsUpdated: number;
}

export function normalizeDatabaseLocations(): NormalizationStats {
  initDatabase();

  const rows = db.prepare('SELECT id, title, company, platform, location, description, city, state, fingerprint FROM jobs').all() as any[];

  let updatedCount = 0;
  let withCity = 0;
  let withState = 0;
  let remoteCount = 0;
  let fingerprintsUpdated = 0;

  const updateStmt = db.prepare(`
    UPDATE jobs 
    SET city = ?, state = ?, location = ?, fingerprint = ? 
    WHERE id = ?
  `);

  const runUpdates = db.transaction(() => {
    for (const row of rows) {
      const canonical = parseCanonicalLocation(
        row.location,
        row.platform,
        row.title,
        row.description
      );

      const targetCity = canonical.city || null;
      const targetState = canonical.state || null;
      const targetLocation = canonical.canonicalLocation || row.location || null;
      const newFingerprint = generateJobFingerprint(row.title, row.company, targetLocation);

      if (targetCity) withCity++;
      if (targetState) withState++;
      if (canonical.isRemote) remoteCount++;

      const isChanged =
        row.city !== targetCity ||
        row.state !== targetState ||
        row.location !== targetLocation ||
        row.fingerprint !== newFingerprint;

      if (isChanged) {
        updateStmt.run(targetCity, targetState, targetLocation, newFingerprint, row.id);
        updatedCount++;
        if (row.fingerprint !== newFingerprint) {
          fingerprintsUpdated++;
        }
      }
    }
  });

  runUpdates();

  const stats: NormalizationStats = {
    totalAnalyzed: rows.length,
    updatedCount,
    withCity,
    withState,
    remoteCount,
    fingerprintsUpdated,
  };

  return stats;
}

if (process.argv[1]?.endsWith('normalize-locations.ts')) {
  console.log('=== NORMALIZAÇÃO GEOGRÁFICA CANÔNICA DO ACERVO DE VAGAS ===');
  const stats = normalizeDatabaseLocations();
  console.log(`- Total de vagas analisadas: ${stats.totalAnalyzed}`);
  console.log(`- Vagas atualizadas: ${stats.updatedCount}`);
  console.log(`- Vagas com Cidade canônica: ${stats.withCity}`);
  console.log(`- Vagas com Estado (UF): ${stats.withState}`);
  console.log(`- Vagas com modalidade Remota: ${stats.remoteCount}`);
  console.log(`- Fingerprints recalculados: ${stats.fingerprintsUpdated}`);
  console.log('=== CONCLUÍDO COM SUCESSO ===');
}
