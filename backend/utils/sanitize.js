/**
 * Strips HTML tags from a string to prevent XSS, and trims leading/trailing whitespace.
 * @param {any} str - The value to sanitize
 * @returns {any} Sanitized string or original value if not a string
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  // Strip any HTML tags
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Recursively sanitizes all string properties in a value (object, array, or primitive).
 * @param {any} val - The value to sanitize
 * @returns {any} Sanitized value
 */
export function sanitizeValue(val) {
  if (typeof val === 'string') {
    return sanitizeText(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const sanitized = {};
    for (const key of Object.keys(val)) {
      sanitized[key] = sanitizeValue(val[key]);
    }
    return sanitized;
  }
  return val;
}
