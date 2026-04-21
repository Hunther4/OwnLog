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
};

export type ThemeMode = 'light' | 'dark' | 'purple';

export const palettes: Record<ThemeMode, ThemePalette> = {
  light: {
    background: '#f8fafc', // slate-50
    card: '#ffffff', // white
    text: '#0f172a', // slate-900
    textSecondary: '#64748b', // slate-500
    primary: '#6366f1', // indigo-500
    white: '#fff',
    label: '#64748b', // slate-500
    balanceValue: '#0f172a', // slate-900
    accent: '#6366f1', // indigo-500
    border: '#e2e8f0', // slate-200
    goldBorder: '#B8860B', // Dark Goldenrod - premium warm gold
  },
  dark: {
    background: '#09090b', // zinc-950
    card: '#18181b', // zinc-900
    text: '#fafafa', // zinc-50
    textSecondary: '#a1a1aa', // zinc-400
    primary: '#818cf8', // indigo-400
    white: '#fff',
    label: '#a1a1aa', // zinc-400
    balanceValue: '#fafafa', // zinc-50
    accent: '#818cf8', // indigo-400
    border: '#27272a', // zinc-800
    goldBorder: '#D4AF37', // Metallic Gold - shines on black
  },
  purple: {
    background: '#0f0a1a', // Deep midnight purple
    card: '#1a142e', // Dark purple card
    text: '#f5d0fe', // Light purple text (adjusted from #e9d5ff)
    textSecondary: '#c4b5fd', // Medium purple
    primary: '#c084fc', // Electric purple
    white: '#fff',
    label: '#c4b5fd',
    balanceValue: '#f5d0fe',
    accent: '#c084fc', // purple-400
    border: '#3b0764', // purple-950
    goldBorder: '#FFD700', // Gold - pops on purple
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
