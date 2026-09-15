import { z } from "zod";
import { sanitizePlainText } from "@/lib/validations";

const timeHm = z
  .string()
  .transform((v) => v.slice(0, 5))
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (HH:mm)"));

const dayOfWeek = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

const staffStatus = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]);

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Informe o nome").max(80)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? sanitizePlainText(v) : "")),
  durationMin: z.coerce.number().int().min(5).max(480),
  bufferAfterMin: z.coerce.number().int().min(0).max(120).optional().default(0),
  priceCents: z.coerce.number().int().min(0).max(1_000_000_00),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? sanitizePlainText(v) : "")),
  requiresDeposit: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  imageUrl: z
    .union([z.literal(""), z.null(), z.string().trim().url()])
    .optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createStaffSchema = z.object({
  displayName: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Informe o nome").max(80)),
  bio: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? sanitizePlainText(v) : "")),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6})$/, "Cor inválida (#RRGGBB)")
    .optional()
    .or(z.literal("")),
  status: staffStatus.optional().default("ACTIVE"),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  serviceIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateStaffSchema = createStaffSchema.partial();

export const availabilityRuleSchema = z
  .object({
    dayOfWeek,
    startTime: timeHm,
    endTime: timeHm,
    breakStart: timeHm.nullable().optional(),
    breakEnd: timeHm.nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((rule, ctx) => {
    if (rule.startTime >= rule.endTime) {
      ctx.addIssue({
        code: "custom",
        message: "Início deve ser antes do fim",
        path: ["endTime"],
      });
    }
    const hasBreakStart = Boolean(rule.breakStart);
    const hasBreakEnd = Boolean(rule.breakEnd);
    if (hasBreakStart !== hasBreakEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Informe início e fim do intervalo",
        path: ["breakStart"],
      });
    }
    if (
      rule.breakStart &&
      rule.breakEnd &&
      (rule.breakStart >= rule.breakEnd ||
        rule.breakStart < rule.startTime ||
        rule.breakEnd > rule.endTime)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Intervalo deve ficar dentro do expediente",
        path: ["breakStart"],
      });
    }
  });

export const replaceRulesSchema = z.object({
  rules: z.array(availabilityRuleSchema).max(14),
});

export const createExceptionSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
    isDayOff: z.boolean().default(true),
    startTime: timeHm.nullable().optional(),
    endTime: timeHm.nullable().optional(),
    reason: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? sanitizePlainText(v) : "")),
  })
  .superRefine((ex, ctx) => {
    if (!ex.isDayOff) {
      if (!ex.startTime || !ex.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "Informe horário customizado ou marque folga",
          path: ["startTime"],
        });
      } else if (ex.startTime >= ex.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "Início deve ser antes do fim",
          path: ["endTime"],
        });
      }
    }
  });

export const updateSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2).max(120))
    .optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  whatsappE164: z.string().trim().max(20).optional().nullable(),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  addressLine1: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z
    .string()
    .trim()
    .max(2)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase() : v)),
  brandPrimary: z
    .union([
      z.literal(""),
      z.null(),
      z.string().trim().regex(/^#([0-9A-Fa-f]{6})$/),
    ])
    .optional(),
  logoUrl: z
    .union([z.literal(""), z.null(), z.string().trim().url()])
    .optional(),
  slotIntervalMin: z.coerce.number().int().min(5).max(60).optional(),
  bufferBeforeMin: z.coerce.number().int().min(0).max(120).optional(),
  bufferAfterMin: z.coerce.number().int().min(0).max(120).optional(),
  minLeadMin: z.coerce.number().int().min(0).max(7 * 24 * 60).optional(),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365).optional(),
  cancelPolicyMin: z.coerce.number().int().min(0).max(7 * 24 * 60).optional(),
  depositRequired: z.boolean().optional(),
  depositPercent: z.coerce.number().int().min(1).max(100).optional().nullable(),
  depositFixedCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000_00)
    .optional()
    .nullable(),
  paymentProvider: z
    .enum(["NONE", "ASAAS", "STRIPE", "PIX_MANUAL"])
    .optional(),
  waInstanceId: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  waProvider: z.string().trim().max(40).optional().nullable().or(z.literal("")),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
