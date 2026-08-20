import { z } from 'zod';
import { NOTIFICATION_TYPE } from '../models/notification.model.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mongoId = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(/^[a-f\d]{24}$/i, `${fieldName} must be a valid MongoDB ObjectId`);

const TYPE_VALUES = Object.values(NOTIFICATION_TYPE);

// ─── Query Validator for GET /api/v1/notifications ────────────────────────────

export const getNotificationsQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
      isRead: z
        .union([
          z.boolean(),
          z.enum(['true', 'false']),
        ])
        .optional(),
      type: z
        .string()
        .trim()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;
            const types = val.split(',').map((t) => t.trim());
            return types.every((t) => TYPE_VALUES.includes(t));
          },
          { message: `Type must be comma-separated values from: ${TYPE_VALUES.join(', ')}` }
        ),
      entityType: z.string().trim().max(100).optional(),
    })
    .optional(),
});

// ─── Param Validator for /:id ─────────────────────────────────────────────────

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: mongoId('Notification ID'),
  }),
});
