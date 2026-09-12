"use client";

import {
  Field as FormischField,
  Form,
  submit,
  useForm,
  validate,
} from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import * as React from "react";

import { PasswordField, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Text from "@/components/ui/text";
import {
  SignupSchema,
  type ActionResult,
  type SignupInput,
} from "@/lib/schemas/auth";

export function SignupForm({
  action,
  defaultEmail,
}: {
  action: (input: SignupInput) => Promise<ActionResult>;
  defaultEmail?: string;
}) {
  const form = useForm({
    schema: SignupSchema,
    initialInput: { fullName: "", email: defaultEmail ?? "", password: "" },
    validate: "submit",
    revalidate: "input",
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit: SubmitHandler<typeof SignupSchema> = async (output) => {
    setServerError(null);
    const result = await action(output);
    if (result?.error) setServerError(result.error);
  };

  const handleClick = async () => {
    const result = await validate(form);
    if (result.success) submit(form);
  };

  return (
    <Form of={form} onSubmit={handleSubmit} className="flex flex-col gap-5.5">
      <div className="flex flex-col gap-3">
        <FormischField of={form} path={["fullName"]}>
          {(field) => (
            <TextField
              id="signup-name"
              label="Full name"
              autoComplete="name"
              value={field.input ?? ""}
              onChange={field.onChange}
              errors={field.errors}
              inputProps={field.props}
            />
          )}
        </FormischField>

        <FormischField of={form} path={["email"]}>
          {(field) => (
            <TextField
              id="signup-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={field.input ?? ""}
              onChange={field.onChange}
              errors={field.errors}
              inputProps={field.props}
            />
          )}
        </FormischField>

        <FormischField of={form} path={["password"]}>
          {(field) => (
            <PasswordField
              id="signup-password"
              label="Password"
              autoComplete="new-password"
              value={field.input ?? ""}
              onChange={field.onChange}
              errors={field.errors}
              inputProps={field.props}
            />
          )}
        </FormischField>

        {serverError ? (
          <Text as="p" role="alert" className="text-sm text-destructive">
            {serverError}
          </Text>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Button
          type="button"
          size="cta"
          disabled={form.isSubmitting}
          onClick={handleClick}
        >
          {form.isSubmitting ? <Spinner /> : "Create account"}
        </Button>

        <Text as="p" className="text-sm text-muted-foreground">
          At least 8 characters. By creating an account you agree to our Terms
          and Privacy Policy.
        </Text>
      </div>
    </Form>
  );
}
