// Validation utility functions

/**
 * Validates that a value is not null or undefined
 * @param {*} value - The value to check
 * @param {string} fieldName - Name of the field being validated
 * @throws {Error} If validation fails
 */
export const validateRequired = (value, fieldName) => {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
};

/**
 * Validates that a value is a positive integer
 * @param {number} value - The value to check
 * @param {string} fieldName - Name of the field being validated
 * @throws {Error} If validation fails
 */
export const validatePositiveInteger = (value, fieldName) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
};

/**
 * Validates that a value is a valid UUID
 * @param {string} value - The value to check
 * @returns {boolean} True if the value is a valid UUID, false otherwise
 */
export const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validates that a value is a valid date string
 * @param {string} value - The value to check
 * @param {string} fieldName - Name of the field being validated
 * @throws {Error} If validation fails
 */
export const validateDateString = (value, fieldName) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
};

/**
 * Validates that a value is a non-empty string
 * @param {string} value - The value to check
 * @param {string} fieldName - Name of the field being validated
 * @throws {Error} If validation fails
 */
export const validateString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}; 