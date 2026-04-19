/**
 * Currency formatter utility for HuntherWallet.
 */

export type CurrencyCode = 'CLP' | 'USD' | 'EUR';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; currency: string }> = {
  CLP: { locale: 'es-CL', currency: 'CLP' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
};

/**
 * Formats a numeric amount into a currency string based on the provided currency code.
 *
 * @param amount - The numeric value to format.
 * @param currencyCode - The currency code to use for formatting.
 * @returns A formatted currency string.
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'CLP'): string {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.CLP;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    // For CLP, we typically don't show decimals.
    minimumFractionDigits: currencyCode === 'CLP' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'CLP' ? 0 : 2,
  }).format(amount);
}

/**
 * Returns the currency symbol for the given currency code.
 */
export function getCurrencySymbol(currencyCode: CurrencyCode = 'CLP'): string {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.CLP;
  return (
    new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value || ''
  );
}
