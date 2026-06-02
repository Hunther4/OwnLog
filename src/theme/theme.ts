export type ThemePalette = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  white: string;
  label: string;
  balanceValue: string;
  accent?: string;
  border?: string;
  goldBorder?: string;
  income: string;
  expense: string;
  delete: string;
  chartBlue: string;
};

export type ThemeMode = 'light' | 'dark' | 'purple';

export const palettes: Record<ThemeMode, ThemePalette> = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    primary: '#6366f1',
    white: '#fff',
    label: '#64748b',
    balanceValue: '#0f172a',
    accent: '#6366f1',
    border: '#e2e8f0',
    goldBorder: '#B8860B',
    income: '#4caf50',
    expense: '#ff5252',
    delete: '#ff3b30',
    chartBlue: '#36A2EB',
  },
  dark: {
    background: '#09090b',
    card: '#18181b',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    primary: '#818cf8',
    white: '#fff',
    label: '#a1a1aa',
    balanceValue: '#fafafa',
    accent: '#818cf8',
    border: '#27272a',
    goldBorder: '#D4AF37',
    income: '#4caf50',
    expense: '#ff5252',
    delete: '#ff3b30',
    chartBlue: '#36A2EB',
  },
  purple: {
    background: '#0f0a1a',
    card: '#1a142e',
    text: '#f5d0fe',
    textSecondary: '#c4b5fd',
    primary: '#c084fc',
    white: '#fff',
    label: '#c4b5fd',
    balanceValue: '#f5d0fe',
    accent: '#c084fc',
    border: '#3b0764',
    goldBorder: '#FFD700',
    income: '#4caf50',
    expense: '#ff5252',
    delete: '#ff3b30',
    chartBlue: '#36A2EB',
  },
};

export const theme = {
  colors: {
    // Fallback colors - should use getPalette(mode) for dynamic themes
    background: '#f5f5f5',
    card: '#fff',
    text: '#333',
    textSecondary: '#666',
    primary: '#007AFF',
    white: '#fff',
    error: '#ff3b30',
    border: '#ddd',
  },
  spacing: {
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  typography: {
    label: {
      fontSize: 14,
    },
    value: {
      fontSize: 36,
      fontWeight: 'bold' as const,
    },
    button: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: '#fff',
    },
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
};

export const getPalette = (mode: ThemeMode): ThemePalette => {
  const palette = palettes[mode];
  // Fallback to dark if mode is invalid or undefined
  return palette ?? palettes.dark;
};
