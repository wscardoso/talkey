import { z } from "zod";
import { normalizePhoneE164, sanitizePlainText } from "@/lib/validations";
import { slugifyTenantName } from "@/lib/slugify";

export { slugifyTenantName };

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const signupSchema = z.object({
  salonName: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Informe o nome do negócio").max(120)),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z
        .string()
        .min(2, "Slug muito curto")
        .max(48)
        .regex(slugRegex, "Use apenas letras minúsculas, números e hífens"),
    ),
  ownerName: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Informe seu nome").max(120)),
  email: z.string().trim().email("E-mail inválido").transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Senha com pelo menos 8 caracteres")
    .max(72),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return null;
      return normalizePhoneE164(v);
    })
    .refine((v) => v === null || /^\+55\d{10,11}$/.test(v), {
      message: "Telefone inválido (DDD + número)",
    }),
});

export type SignupInput = z.infer<typeof signupSchema>;
