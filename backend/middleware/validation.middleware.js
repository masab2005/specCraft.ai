/**
 * Express middleware to validate request data against a Zod schema.
 * Supports validation of body, query, and params.
 * On validation failure, returns a structured 400 Bad Request response.
 * On success, replaces req.body, req.query, and req.params with the validated & sanitized data.
 * 
 * @param {import('zod').ZodObject} schema - The Zod schema to validate against.
 */
export const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const dataToValidate = {};
      if (schema.shape.body) dataToValidate.body = req.body;
      if (schema.shape.query) dataToValidate.query = req.query;
      if (schema.shape.params) dataToValidate.params = req.params;

      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.issues.map((err) => ({
            // Remove 'body', 'query', or 'params' prefix from path for cleaner client errors
            field: err.path.slice(1).join('.') || err.path.join('.'),
            message: err.message
          }))
        });
      }

      // Re-assign parsed and sanitized values to req
      if (parsed.data.body !== undefined) req.body = parsed.data.body;
      if (parsed.data.query !== undefined) req.query = parsed.data.query;
      if (parsed.data.params !== undefined) req.params = parsed.data.params;

      next();
    } catch (err) {
      next(err);
    }
  };
};
