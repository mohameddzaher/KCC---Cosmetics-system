/**
 * One way to write an amount of money.
 *
 * Four screens had grown their own copy of this, and they did not agree — one
 * of them printed a dollar sign for a Saudi company. An amount a customer is
 * asked to pay should not depend on which page they happen to be reading.
 */

/** Saudi riyal, the only currency the business quotes in today. */
export const CURRENCY = 'SAR';

/**
 * @param amount a figure already rounded by the server
 * @param locale 'ar' puts the riyal symbol where an Arabic reader expects it
 */
export function formatCurrency(amount: number | undefined | null, locale: 'en' | 'ar' = 'en'): string {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    // Never let a formatting failure hide the number itself.
    return `${value.toFixed(2)} ${CURRENCY}`;
  }
}
