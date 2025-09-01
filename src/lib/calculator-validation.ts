// Type for numeric inputs that can be empty
export type NumericOrEmpty = number | '';

// Check if a value is a valid number (not NaN, not empty string)
export function isValidNumber(value: NumericOrEmpty): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Convert NumericOrEmpty to number, returning 0 for empty strings
export function toNumber(value: NumericOrEmpty): number {
  return typeof value === 'number' ? value : 0;
}

// Validate calculator inputs - returns array of field names that are invalid
export function validateCalculatorInputs(
  inputs: Record<string, NumericOrEmpty>,
  requiredFields: string[] = []
): string[] {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    const value = inputs[field];
    if (value === '' || value === null || value === undefined) {
      errors.push(field);
    } else if (!isValidNumber(value)) {
      errors.push(field);
    } else if (value <= 0) {
      errors.push(field);
    }
  }
  
  return errors;
}

// Format field names for user-friendly error messages
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
