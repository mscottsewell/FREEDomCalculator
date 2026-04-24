import { NumericOrEmpty } from './calculator-validation';

// Module-level singletons — Intl construction is expensive; never create per-call
const _currencyWhole = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const _currencyDecimal = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const _commas = new Intl.NumberFormat('en-US');

export function formatCurrency(amount: number, includeDecimals: boolean = false): string {
  return (includeDecimals ? _currencyDecimal : _currencyWhole).format(amount);
}

export function formatNumberWithCommas(value: NumericOrEmpty | string): string {
  if (value === '' || value === null || value === undefined) return '';
  if (value === '-' || value === '-.') return value as string;
  const num = typeof value === 'number' ? value : parseFloat(value.toString());
  if (isNaN(num)) return '';
  return _commas.format(num);
}

export function parseFormattedNumber(value: string): NumericOrEmpty {
  if (value === '' || value === null || value === undefined) return '';
  const cleanValue = value.replace(/,/g, '').trim();
  if (cleanValue === '') return '';
  if (cleanValue === '-' || cleanValue === '-.') return cleanValue as any;
  const num = parseFloat(cleanValue);
  return isNaN(num) ? '' : num;
}

export function formatPercentage(value: NumericOrEmpty): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '';
  return `${num}%`;
}

export function parsePercentage(value: string): NumericOrEmpty {
  if (value === '') return '';
  const cleanValue = value.replace(/%/g, '').trim();
  const num = parseFloat(cleanValue);
  return isNaN(num) ? '' : num;
}
