import * as v from "valibot";

const email = v.pipe(
  v.string(),
  v.trim(),
  v.email("Enter a valid email address."),
);

const newPassword = v.pipe(
  v.string(),
  v.minLength(8, "At least 8 characters, one number."),
  v.regex(/[0-9]/, "At least 8 characters, one number."),
);

export const LoginSchema = v.object({
  email,
  password: v.pipe(v.string(), v.minLength(1, "Enter your password.")),
});

export const SignupSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Enter your full name."),
  ),
  email,
  password: newPassword,
});

export const EmailSchema = v.object({ email });

export const NewPasswordSchema = v.pipe(
  v.object({ password: newPassword, confirmPassword: v.string() }),
  v.forward(
    v.partialCheck(
      [["password"], ["confirmPassword"]],
      (input) => input.password === input.confirmPassword,
      "Passwords do not match.",
    ),
    ["confirmPassword"],
  ),
);

export type LoginInput = v.InferOutput<typeof LoginSchema>;
export type SignupInput = v.InferOutput<typeof SignupSchema>;
export type EmailInput = v.InferOutput<typeof EmailSchema>;
export type NewPasswordInput = v.InferOutput<typeof NewPasswordSchema>;

export type ActionResult = { error: string } | void;
