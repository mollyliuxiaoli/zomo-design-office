import { describe, it, expect, beforeEach } from 'vitest';
import { styleRepo } from '@/app/lib/storage/repo';
import { normalizeSpec, withDerived } from '@/app/lib/ai-client';
import type { LibraryRecord } from '@/app/lib/storage/db';
import type { StyleSpecV1Input } from '@/app/lib/spec/types';

function makeRecord(overrides: Partial<LibraryRecord> = {}): LibraryRecord {
  const spec = withDerived(normalizeSpec({
    styleName: overrides.title || 'Test Style',
    ...(overrides.spec as StyleSpecV1Input || {}),
  }));
  return {
    id: overrides.id || `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    spec,
    source: overrides.source || { type: 'user', label: 'test' },
    title: overrides.title || 'Test Style',
    thumbnailUrl: overrides.thumbnailUrl || '',
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    visibility: overrides.visibility || 'private',
  };
}

describe('styleRepo CRUD', () => {
  beforeEach(async () => {
    // Clean up all records between tests
    const all = await styleRepo.listAll();
    for (const r of all) {
      await styleRepo.delete(r.id);
    }
  });

  it('saves and retrieves a record', async () => {
    const record = makeRecord({ title: 'Save Test' });
    const saved = await styleRepo.save(record);
    expect(saved.id).toBe(record.id);
    expect(saved.title).toBe('Save Test');

    const found = await styleRepo.findById(record.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Save Test');
  });

  it('lists all records sorted by createdAt desc', async () => {
    const r1 = makeRecord({ title: 'First', createdAt: '2024-01-01T00:00:00Z' });
    const r2 = makeRecord({ title: 'Second', createdAt: '2024-06-01T00:00:00Z' });
    await styleRepo.save(r1);
    await styleRepo.save(r2);

    const list = await styleRepo.listAll();
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe('Second'); // newer first
    expect(list[1].title).toBe('First');
  });

  it('updates a record', async () => {
    const record = makeRecord({ title: 'Original' });
    await styleRepo.save(record);

    const updated = await styleRepo.update(record.id, { title: 'Updated' });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated');

    const found = await styleRepo.findById(record.id);
    expect(found!.title).toBe('Updated');
  });

  it('returns undefined when updating non-existent record', async () => {
    const result = await styleRepo.update('non-existent-id', { title: 'Nope' });
    expect(result).toBeUndefined();
  });

  it('deletes a record', async () => {
    const record = makeRecord();
    await styleRepo.save(record);
    await styleRepo.delete(record.id);
    const found = await styleRepo.findById(record.id);
    expect(found).toBeUndefined();
  });

  it('counts records', async () => {
    await styleRepo.save(makeRecord());
    await styleRepo.save(makeRecord());
    const count = await styleRepo.count();
    expect(count).toBe(2);
  });

  it('exports all records as JSON string', async () => {
    await styleRepo.save(makeRecord({ title: 'Export1' }));
    await styleRepo.save(makeRecord({ title: 'Export2' }));
    const json = await styleRepo.exportAll();
    const parsed = JSON.parse(json);
    expect(parsed.records).toHaveLength(2);
    expect(parsed.exportedAt).toBeTruthy();
  });

  it('imports valid records from JSON', async () => {
    const records = [makeRecord({ title: 'Import1' }), makeRecord({ title: 'Import2' })];
    const count = await styleRepo.importFromJson({ records });
    expect(count).toBe(2);

    const all = await styleRepo.listAll();
    expect(all).toHaveLength(2);
  });

  it('imports from JSON string', async () => {
    const record = makeRecord({ title: 'FromString' });
    const json = JSON.stringify({ records: [record] });
    const count = await styleRepo.importFromJson(json);
    expect(count).toBe(1);
  });

  it('skips invalid records during import', async () => {
    const valid = makeRecord({ title: 'Valid' });
    const invalid = { noId: true }; // missing id and spec
    const count = await styleRepo.importFromJson({ records: [valid, invalid as any] });
    expect(count).toBe(1);
  });

  it('imports from { styles: [...] } format', async () => {
    const record = makeRecord({ title: 'StylesFormat' });
    const count = await styleRepo.importFromJson({ styles: [record] });
    expect(count).toBe(1);
  });

  it('supports functional update', async () => {
    const record = makeRecord({ title: 'FuncTest' });
    await styleRepo.save(record);

    const updated = await styleRepo.update(record.id, (existing) => ({
      ...existing,
      title: 'FuncUpdated',
    }));
    expect(updated!.title).toBe('FuncUpdated');
  });
});
