import { styleRepo } from '@/app/lib/storage/repo';
import type { LibraryRecord } from '@/app/lib/storage/db';
import { normalizeSpec, withDerived, type StyleSpecV1Input } from '@/app/lib/ai-client';
import type { Style } from '@/types/style';

const STORAGE_KEY = 'zomo_styles';

// Idempotency guard — migration runs only once per session
let migrationPromise: Promise<number> | undefined;

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function isValidLegacyStyle(value: unknown): value is Style {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.name === 'string';
}

/**
 * Map legacy Style.typography { headings, body, description }
 * to StyleSpecV1.typography { fontStyle, suggestedFonts, ... }
 */
function mapLegacyTypography(typo: Style['typography']): StyleSpecV1Input['typography'] {
  return {
    fontStyle: 'sans',
    suggestedFonts: [
      typo?.headings || 'Inter',
      typo?.body || 'Inter',
    ].filter(Boolean),
    scale: 'balanced',
    headingWeight: '700',
    bodyWeight: '400',
    letterSpacing: 'normal',
    lineHeight: 'normal',
  };
}

function oldStyleToRecord(style: Style): LibraryRecord {
  const createdAt = style.createdAt || new Date().toISOString();
  const keywords = Array.from(new Set([
    ...stringArray(style.visualStyle),
    ...stringArray(style.styleTags),
  ]));

  const specInput: StyleSpecV1Input = {
    styleId: style.id,
    styleName: style.name,
    source: {
      type: 'image',
      createdAt,
      model: 'legacy-localStorage',
      thumbnailRef: style.imageUrl,
    },
    colors: {
      primary: style.colors?.primary,
      secondary: style.colors?.secondary,
      background: style.colors?.background,
    },
    typography: mapLegacyTypography(style.typography),
    vibe: {
      keywords,
      description: style.description,
    },
    derived: {
      cssVariables: style.cssContent,
      markdown: style.markdownContent,
      restorationPrompt: style.promptContent,
    },
  };

  // Normalize + derive to ensure a complete StyleSpecV1
  const fullSpec = withDerived(normalizeSpec(specInput));

  return {
    id: style.id,
    spec: fullSpec,
    source: {
      type: 'import' as const,
      label: 'localStorage migration',
    },
    title: style.name,
    thumbnailUrl: style.imageUrl || '',
    createdAt,
    updatedAt: createdAt,
    visibility: 'private' as const,
  };
}

export async function migrateIfNeeded(): Promise<number> {
  // Idempotency: only run once
  if (migrationPromise) return migrationPromise;

  migrationPromise = _doMigration();
  return migrationPromise;
}

async function _doMigration(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn('[distill] Failed to parse legacy localStorage data, clearing:', err);
    localStorage.removeItem(STORAGE_KEY);
    return 0;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return 0;
  }

  let migrated = 0;
  for (const item of parsed) {
    if (!isValidLegacyStyle(item)) {
      console.warn('[distill] Skipping invalid legacy record:', item);
      continue;
    }
    try {
      await styleRepo.save(oldStyleToRecord(item));
      migrated += 1;
    } catch (err) {
      console.warn('[distill] Failed to migrate record:', item.id, err);
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  console.log(`[distill] Migrated ${migrated} records from localStorage to IndexedDB`);
  return migrated;
}
