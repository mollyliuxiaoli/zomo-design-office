import { Style } from '@/types/style';

// DEPRECATED: use app/lib/storage/repo.ts instead.
// This shim throws in development to prevent silent data loss from lingering imports.

function deprecated(method: string): never {
  throw new Error(
    `storageUtils.${method}() is deprecated. Import { styleRepo } from '@/app/lib/storage/repo' instead.`
  );
}

export const storageUtils = {
  getStyles: (): Style[] => {
    if (process.env.NODE_ENV === 'development') deprecated('getStyles');
    return [];
  },

  saveStyle: (style: Style): void => {
    if (process.env.NODE_ENV === 'development') deprecated('saveStyle');
    void style;
  },

  deleteStyle: (id: string): void => {
    if (process.env.NODE_ENV === 'development') deprecated('deleteStyle');
    void id;
  },

  getStyleById: (id: string): Style | undefined => {
    if (process.env.NODE_ENV === 'development') deprecated('getStyleById');
    void id;
    return undefined;
  }
};
