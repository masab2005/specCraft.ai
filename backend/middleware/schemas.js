import { z } from 'zod';
import { sanitizeText } from '../utils/sanitize.js';

// Helper to create a sanitized string validation schema
const sanitizedString = (minLength, maxLength) =>
  z.string()
    .min(minLength, { message: `Must be at least ${minLength} characters` })
    .max(maxLength, { message: `Must be at most ${maxLength} characters` })
    .transform(val => sanitizeText(val))
    .refine(val => val.length >= minLength, {
      message: `Must be at least ${minLength} characters long after stripping HTML tags`
    });

// Helper for arrays of sanitized strings (e.g. actors, features, entities)
const stringArraySchema = z.array(
  z.string()
    .max(100, { message: 'Item name must be at most 100 characters' })
    .transform(val => sanitizeText(val))
    .refine(val => val.length > 0, { message: 'Item name cannot be empty' })
).max(50, { message: 'Array cannot contain more than 50 items' });

// Complexity enum helper
const complexitySchema = z.string()
  .transform(val => sanitizeText(val))
  .refine(val => ['simple', 'moderate', 'complex', 'standard'].includes(val.toLowerCase()), {
    message: 'Complexity must be one of: simple, moderate, complex, standard'
  })
  .transform(val => val.toLowerCase());

// 1. Parameter Validation Schemas (IDs are integers in the DB)
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be an integer string' }).transform(Number)
  })
});

export const projectIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().regex(/^\d+$/, { message: 'Project ID must be an integer string' }).transform(Number)
  })
});

// 2. Project routes schemas
export const createProjectSchema = z.object({
  body: z.object({
    name: sanitizedString(3, 100),
    description: sanitizedString(10, 2000),
    domain: sanitizedString(2, 100),
    complexity: complexitySchema,
    actors: stringArraySchema.optional(),
    features: stringArraySchema.optional(),
    entities: stringArraySchema.optional()
  })
});

// 3. Specification routes schemas
export const updateSpecificationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be an integer string' }).transform(Number)
  }),
  body: z.object({
    masterJson: z.object({
      project: z.object({
        id: z.number().int({ message: 'Project ID must be an integer' }),
        name: sanitizedString(3, 100),
        description: sanitizedString(10, 2000),
        domain: sanitizedString(2, 100),
        complexity: complexitySchema
      }),
      actors: stringArraySchema,
      features: stringArraySchema,
      entities: stringArraySchema,
      attributes: z.record(z.string(), z.array(z.string())),
      relationships: z.array(
        z.object({
          source: z.string().min(1, { message: 'Source entity name is required' }),
          target: z.string().min(1, { message: 'Target entity name is required' }),
          type: z.enum(['one-to-one', 'one-to-many', 'many-to-many'], {
            errorMap: () => ({ message: "Type must be one-to-one, one-to-many, or many-to-many" })
          }),
          label: z.string().max(100).transform(val => sanitizeText(val)).optional()
        })
      ),
      diagrams: z.any().optional()
    })
  })
});

// 4. Artifact routes schemas
export const getDiagramsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be an integer string' }).transform(Number)
  }),
  query: z.object({
    type: z.enum(['er', 'class', 'usecase'], {
      errorMap: () => ({ message: "Type must be er, class, or usecase" })
    }).optional()
  })
});

export const getSrsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be an integer string' }).transform(Number)
  }),
  query: z.object({
    format: z.enum(['pdf', 'markdown'], {
      errorMap: () => ({ message: "Format must be pdf or markdown" })
    }).optional()
  })
});

// 5. AI routes schemas
export const aiTestSchema = z.object({
  body: z.object({
    message: z.string().min(1, { message: 'Message is required' }).max(1000).transform(val => sanitizeText(val))
  })
});

export const aiDiagramSchema = z.object({
  body: z.object({
    diagram: z.string()
      .min(10, { message: 'Diagram is too short' })
      .max(10000, { message: 'Diagram is too long' })
      .refine(val => val.includes('@startuml') && val.includes('@enduml'), {
        message: 'Diagram must contain @startuml and @enduml tags'
      })
  })
});

export const aiGenerateErSchema = z.object({
  body: z.object({
    entities: stringArraySchema,
    attributes: z.any().optional(),
    relationships: z.any().optional(),
    type: z.string().optional()
  })
});

export const aiGenerateUseCaseSchema = z.object({
  body: z.object({
    actors: stringArraySchema,
    useCases: stringArraySchema,
    relationships: z.any().optional(),
    type: z.string().optional()
  })
});

export const aiGenerateClassSchema = z.object({
  body: z.object({
    classes: z.array(
      z.object({
        name: z.string().min(1).max(100).transform(val => sanitizeText(val)),
        attributes: z.array(z.string().max(100).transform(val => sanitizeText(val))).optional(),
        methods: z.array(z.string().max(100).transform(val => sanitizeText(val))).optional()
      })
    ).max(50, { message: 'Cannot generate classes for more than 50 classes at once' }),
    relationships: z.any().optional(),
    type: z.string().optional()
  })
});
