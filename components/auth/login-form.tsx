"use client";

import {
  Field as FormischField,
  Form,
  submit,
  useForm,
  validate,
} from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import Link from "next/link";
import * as React from "react";

import { PasswordField, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Text from "@/components/ui/text";
import {
  LoginSchema,
  type ActionResult,
  type LoginInput,
} from "@/lib/schemas/auth";

export function LoginForm({
  action,
  next,
  defaultEmail,
  submitLabel = "Log in",
  showForgotLink = true,
}: {
  action: (input: LoginInput, next?: string) => Promise<ActionResult>;
  next?: string;
  defaultEmail?: string;
  submitLabel?: string;
  showForgotLink?: boolean;
}) {
  const form = useForm({
    schema: LoginSchema,
    initialInput: { email: defaultEmail ?? "", password: "" },
    validate: "submit",
    revalidate: "input",
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit: SubmitHandler<typeof LoginSchema> = async (output) => {
    setServerError(null);
    const result = await action(output, next);
    if (result?.error) setServerError(result.error);
  };

  const handleClick = async () => {
    const result = await validate(form);
    if (result.success) submit(form);
  };

  return (
    <Form
      of={form}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5.5"
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-3">
          <FormischField of={form} path={["email"]}>
            {(field) => (
              <TextField
                id="login-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={field.input ?? ""}
                errors={field.errors}
                inputProps={field.props}
              />
            )}
          </FormischField>

          <FormischField of={form} path={["password"]}>
            {(field) => (
              <PasswordField
                id="login-password"
                label="Password"
                autoComplete="current-password"
                value={field.input ?? ""}
                errors={field.errors}
                inputProps={field.props}
              />
            )}
          </FormischField>
        </div>

        {showForgotLink ? (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="border-border border-b pb-px"
            >
              <Text className="text-sm">Forgot password?</Text>
            </Link>
          </div>
        ) : null}

        {serverError ? (
          <Text as="p" role="alert" className="text-sm text-destructive">
            {serverError}
          </Text>
        ) : null}
      </div>

      <Button
        type="button"
        size="cta"
        disabled={form.isSubmitting}
        onClick={handleClick}
      >
        {form.isSubmitting ? <Spinner /> : submitLabel}
      </Button>
    </Form>
  );
}
