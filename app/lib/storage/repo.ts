import { normalizeSpec, withDerived, type StyleSpecV1Input } from '@/app/lib/ai-client';
import { getDb } from '@/app/lib/storage/db';
import type { LibraryRecord } from '@/app/lib/storage/db';

type ImportPayload = LibraryRecord[] | { styles?: LibraryRecord[]; records?: LibraryRecord[] };
type UpdatePatch = Partial<Omit<LibraryRecord, 'id' | 'createdAt'>>;

function nowIso(): string {
  return new Date().toISOString();
}

function prepareRecord(record: LibraryRecord): LibraryRecord {
  const normalized = normalizeSpec(record.spec as StyleSpecV1Input);
  const spec = withDerived({
    ...normalized,
    styleId: record.id,
    styleName: record.title || normalized.styleName,
  });
  const timestamp = nowIso();

  return {
    ...record,
    id: record.id || spec.styleId,
    spec,
    title: record.title || spec.styleName,
    thumbnailUrl: record.thumbnailUrl || spec.source.thumbnailRef || '',
    createdAt: record.createdAt || spec.source.createdAt || timestamp,
    updatedAt: timestamp,
    visibility: record.visibility || 'private',
    source: record.source || { type: 'user' as const },
  };
}

function recordsFromJson(input: string | ImportPayload): LibraryRecord[] {
  const parsed = typeof input === 'string' ? JSON.parse(input) as ImportPayload : input;
  if (Array.isArray(parsed)) return parsed;
  return parsed.records || parsed.styles || [];
}

export const styleRepo = {
  async save(record: LibraryRecord): Promise<LibraryRecord> {
    const prepared = prepareRecord(record);
    await getDb().styles.put(prepared);
    return prepared;
  },

  async findById(id: string): Promise<LibraryRecord | undefined> {
    return getDb().styles.get(id);
  },

  async listAll(): Promise<LibraryRecord[]> {
    return getDb().styles.orderBy('createdAt').reverse().toArray();
  },

  async update(id: string, patch: UpdatePatch | ((record: LibraryRecord) => LibraryRecord | UpdatePatch)): Promise<LibraryRecord | undefined> {
    const db = getDb();
    const existing = await db.styles.get(id);
    if (!existing) return undefined;

    const nextPatch = typeof patch === 'function' ? patch(existing) : patch;
    const nextRecord = 'id' in nextPatch
      ? nextPatch as LibraryRecord
      : { ...existing, ...nextPatch, id, createdAt: existing.createdAt };

    return styleRepo.save(nextRecord as LibraryRecord);
  },

  async delete(id: string): Promise<void> {
    await getDb().styles.delete(id);
  },

  async count(): Promise<number> {
    return getDb().styles.count();
  },

  async exportAll(): Promise<string> {
    const records = await styleRepo.listAll();
    return JSON.stringify({ exportedAt: nowIso(), records }, null, 2);
  },

  async importFromJson(input: string | ImportPayload): Promise<number> {
    const records = recordsFromJson(input);
    let imported = 0;

    for (const record of records) {
      await styleRepo.save(record);
      imported += 1;
    }

    return imported;
  },
};
