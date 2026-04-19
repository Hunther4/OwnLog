/**
 * HUNTHERWALLET ROUTE CONSTANTS
 * Single source of truth for all application navigation paths.
 * Prevents "404" errors and typo-driven routing bugs.
 */

export const ROUTES = {
  // Tabs
  HOME: '/',
  TRANSACTIONS: '/transactions',
  BUDGETS: '/budgets',
  REPORTS: '/reports',
  CATEGORIES: '/categories',
  SETTINGS: '/settings',

  // Feature Pages
  ADD_TRANSACTION: '/add-transaction',
  BACKUP: '/settings/backup',

  // System
  NOT_FOUND: '/+not-found',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
