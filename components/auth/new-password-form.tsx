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

import { PasswordField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Text from "@/components/ui/text";
import {
  NewPasswordSchema,
  type ActionResult,
  type NewPasswordInput,
} from "@/lib/schemas/auth";

export function NewPasswordForm({
  action,
}: {
  action: (input: NewPasswordInput) => Promise<ActionResult>;
}) {
  const form = useForm({
    schema: NewPasswordSchema,
    initialInput: { password: "", confirmPassword: "" },
    validate: "submit",
    revalidate: "input",
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit: SubmitHandler<typeof NewPasswordSchema> = async (
    output,
  ) => {
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
        <FormischField of={form} path={["password"]}>
          {(field) => (
            <PasswordField
              id="new-password"
              label="New password"
              autoComplete="new-password"
              hint="At least 8 characters, one number."
              value={field.input ?? ""}
              onChange={field.onChange}
              errors={field.errors}
              inputProps={field.props}
            />
          )}
        </FormischField>

        <FormischField of={form} path={["confirmPassword"]}>
          {(field) => (
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
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

      <Button
        type="button"
        size="cta"
        disabled={form.isSubmitting}
        onClick={handleClick}
      >
        {form.isSubmitting ? <Spinner /> : "Save and log in"}
      </Button>
    </Form>
  );
}
