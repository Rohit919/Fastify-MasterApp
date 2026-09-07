import { z } from 'zod';

/** Mirrors CreateRoleBody / UpdateRoleBody (name 2–64, description ≤500). */
export const roleFormSchema = z.object({
  name: z.string().min(2, 'validation:minLength').max(64, 'validation:maxLength'),
  description: z.string().max(500, 'validation:maxLength').optional().or(z.literal('')),
});
export type RoleForm = z.infer<typeof roleFormSchema>;
