import { NumericOrEmpty } from './calculator-validation';

/**
 * Format a number as currency (USD)
 * @param amount The amount to format
 * @param includeDecimals Whether to include decimal places (default: false)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, includeDecimals: boolean = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format a number with comma separators for display in input fields
 * @param value The value to format (can be number, string, or empty)
 * @returns Formatted string with commas
 */
export function formatNumberWithCommas(value: NumericOrEmpty | string): string {
  if (value === '' || value === null || value === undefined) return '';
  
  // Handle intermediate input states for negative numbers
  if (value === '-' || value === '-.') {
    return value as string;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value.toString());
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Parse a comma-formatted string back to a number
 * @param value The formatted string to parse
 * @returns The parsed number or empty string
 */
export function parseFormattedNumber(value: string): NumericOrEmpty {
  if (value === '' || value === null || value === undefined) return '';
  
  // Remove commas and parse
  const cleanValue = value.replace(/,/g, '').trim();
  if (cleanValue === '') return '';
  
  // Allow intermediate input states for negative numbers
  if (cleanValue === '-' || cleanValue === '-.') {
    return cleanValue as any;
  }
  
  const num = parseFloat(cleanValue);
  return isNaN(num) ? '' : num;
}

/**
 * Format a number as a percentage with % sign for display
 * @param value The value to format (can be number or empty)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: NumericOrEmpty): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseFloat(value.toString());
  if (isNaN(num)) return '';
  return `${num}%`;
}

/**
 * Parse a percentage string back to a number
 * @param value The percentage string to parse (e.g., "5%" or "5")
 * @returns The parsed number or empty string
 */
export function parsePercentage(value: string): NumericOrEmpty {
  if (value === '') return '';
  // Remove % sign and parse
  const cleanValue = value.replace(/%/g, '').trim();
  const num = parseFloat(cleanValue);
  return isNaN(num) ? '' : num;
}
