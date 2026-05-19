import Dexie, { type Table } from 'dexie';
import type { StyleSpecV1 } from '@/app/lib/spec/types';

export type LibraryRecord = {
  id: string;
  spec: StyleSpecV1;
  source: {
    type: 'user' | 'demo' | 'import';
    label?: string;
  };
  title: string;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
  visibility: 'private' | 'public';
};

class DistillDatabase extends Dexie {
  styles!: Table<LibraryRecord, string>;

  constructor() {
    super('distill-db');
    this.version(1).stores({
      styles: 'id, createdAt, updatedAt',
    });
  }
}

// Lazy singleton — avoids SSR/build-time IndexedDB access
let _db: DistillDatabase | undefined;

export function getDb(): DistillDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available in server-side rendering');
  }
  if (!_db) {
    _db = new DistillDatabase();
  }
  return _db;
}

// Convenience export for callers that know they're client-side
export const db = typeof window !== 'undefined' ? new DistillDatabase() : (undefined as unknown as DistillDatabase);
