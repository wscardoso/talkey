import { z } from "zod";
import { sanitizePlainText } from "@/lib/validations";

export const createInviteSchema = z.object({
  email: z.string().trim().email("E-mail inválido").transform((v) => v.toLowerCase()),
  role: z.enum(["OWNER", "MANAGER"]),
  name: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const cleaned = sanitizePlainText(v);
      return cleaned.length >= 2 ? cleaned.slice(0, 120) : undefined;
    }),
});

export const acceptInviteSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(sanitizePlainText)
    .pipe(z.string().min(2, "Informe seu nome").max(120)),
  password: z.string().min(8, "Senha com pelo menos 8 caracteres").max(72),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
