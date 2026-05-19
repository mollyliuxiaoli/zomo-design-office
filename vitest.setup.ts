import { beforeAll } from 'vitest';

// Mock IndexedDB for Dexie (fake-indexeddb)
import 'fake-indexeddb/auto';

// Mock Next.js router
beforeAll(() => {
  // Suppress console.error for expected test noise
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('[distill]') || msg.includes('Warning:')) return;
    orig(...args);
  };
});
