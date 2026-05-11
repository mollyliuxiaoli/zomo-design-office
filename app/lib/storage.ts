import { Style } from '@/types/style';

const STORAGE_KEY = 'zomo_styles';

export const storageUtils = {
  getStyles: (): Style[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  },

  saveStyle: (style: Style): void => {
    if (typeof window === 'undefined') return;
    try {
      const styles = storageUtils.getStyles();
      const existingIndex = styles.findIndex(s => s.id === style.id);

      if (existingIndex >= 0) {
        styles[existingIndex] = style;
      } else {
        styles.push(style);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  deleteStyle: (id: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const styles = storageUtils.getStyles();
      const filtered = styles.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }
  },

  getStyleById: (id: string): Style | undefined => {
    const styles = storageUtils.getStyles();
    return styles.find(s => s.id === id);
  }
};
