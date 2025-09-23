// src/firestore-wipe/firestore-wipe.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type * as admin from 'firebase-admin';

@Injectable()
export class FirestoreWipeService {
  private readonly logger = new Logger(FirestoreWipeService.name);

  constructor(@Inject('FIRESTORE') private readonly db: admin.firestore.Firestore) {}

  /**
   * Vacía toda la base de Firestore (colecciones raíz + subcolecciones).
   * @param opts { dryRun?: boolean; batchSize?: number; concurrency?: number; keep?: string[] }
   *  - dryRun: solo lista lo que borraría
   *  - batchSize: tamaño de lote (máx 500)
   *  - concurrency: documentos procesados en paralelo al recorrer subcolecciones
   *  - keep: ids de colecciones raíz a preservar
   */
  async wipeAll(opts?: {
    dryRun?: boolean;
    batchSize?: number;
    concurrency?: number;
    keep?: string[];
  }) {
    const dryRun = opts?.dryRun ?? false;
    const batchSize = Math.min(Math.max(opts?.batchSize ?? 500, 1), 500);
    const concurrency = Math.max(opts?.concurrency ?? 8, 1);
    const keep = new Set((opts?.keep ?? []).map((s) => s.trim()).filter(Boolean));

    const rootCollections = await this.db.listCollections();
    const toProcess = rootCollections.filter((c) => !keep.has(c.id));

    if (toProcess.length === 0) {
      this.logger.log('No hay colecciones por borrar (o todas en keep).');
      return;
    }

    this.logger.log(
      `${dryRun ? '[DRY-RUN]' : '[WIPE]'} Colecciones raíz: ${toProcess.map((c) => c.id).join(', ')}`
    );

    for (const col of toProcess) {
      await this.deleteCollectionRecursive(col, { dryRun, batchSize, concurrency });
    }

    this.logger.log(dryRun ? '✅ DRY-RUN completado.' : '✅ Firestore vaciado por completo.');
  }

  private async deleteCollectionRecursive(
    collRef: admin.firestore.CollectionReference,
    cfg: { dryRun: boolean; batchSize: number; concurrency: number }
  ) {
    const { dryRun, batchSize, concurrency } = cfg;
    this.logger.log(`${dryRun ? '[DRY-RUN]' : '[DEL]'} Colección: ${collRef.path}`);

    // Bucle hasta vaciar
    while (true) {
      const snap = await collRef.limit(batchSize).get();
      if (snap.empty) break;

      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += concurrency) {
        const slice = docs.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (d) => {
            try {
              await this.deleteDocumentRecursive(d.ref, cfg);
            } catch (e: any) {
              this.logger.warn(`Reintento ${d.ref.path}: ${e?.message || e}`);
              await this.deleteDocumentRecursive(d.ref, cfg);
            }
          })
        );
      }
    }

    this.logger.log(`${dryRun ? '[DRY-RUN]' : '[OK]'} Vacía: ${collRef.path}`);
  }

  private async deleteDocumentRecursive(
    docRef: admin.firestore.DocumentReference,
    cfg: { dryRun: boolean; batchSize: number; concurrency: number }
  ) {
    const { dryRun } = cfg;

    // 1) Subcolecciones primero
    const subCollections = await docRef.listCollections();
    if (subCollections.length > 0) {
      await Promise.all(
        subCollections.map((sub) => this.deleteCollectionRecursive(sub, cfg))
      );
    }

    // 2) Borrar el documento
    if (dryRun) {
      this.logger.log(`[DRY-RUN] Borraría doc: ${docRef.path}`);
    } else {
      await docRef.delete();
    }
  }
}
