import { z } from "zod";

const ROLE_VALUES = ["admin", "support", "viewer", "user"] as const;

/**
 * One user form shape for both create and edit. `password` is optional at the
 * type level; whether it's *required* depends on mode, so we expose a factory
 * that builds the right schema (`userFormSchema(isEdit)`). This keeps a single
 * `useForm<UserForm>` type across both dialogs — no resolver/type mismatch.
 */
export interface UserForm {
  name: string;
  email: string;
  password?: string;
  role: (typeof ROLE_VALUES)[number];
}

export const userFormSchema = (isEdit: boolean) =>
  z.object({
    name: z
      .string()
      .min(2, "validation:minLength")
      .max(100, "validation:maxLength"),
    email: z.string().min(1, "validation:required").email("validation:email"),
    password: isEdit
      ? z.string().max(128, "validation:maxLength").optional().or(z.literal(""))
      : z
          .string()
          .min(8, "validation:passwordMin")
          .max(128, "validation:maxLength"),
    role: z.enum(ROLE_VALUES),
  });

/** Self profile form — mirrors UpdateProfileBody (name + email only). */
export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "validation:minLength")
    .max(100, "validation:maxLength"),
  email: z.string().min(1, "validation:required").email("validation:email"),
});
export type ProfileForm = z.infer<typeof profileSchema>;

export const USER_ROLE_OPTIONS = ROLE_VALUES.map((v) => ({
  label: v,
  value: v,
}));
