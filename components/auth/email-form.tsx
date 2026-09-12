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

import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Text from "@/components/ui/text";
import {
  EmailSchema,
  type ActionResult,
  type EmailInput,
} from "@/lib/schemas/auth";

export function EmailForm({
  action,
  submitLabel,
  id = "email-form",
  defaultEmail,
}: {
  action: (input: EmailInput) => Promise<ActionResult>;
  submitLabel: string;
  id?: string;
  defaultEmail?: string;
}) {
  const form = useForm({
    schema: EmailSchema,
    initialInput: { email: defaultEmail ?? "" },
    validate: "submit",
    revalidate: "input",
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit: SubmitHandler<typeof EmailSchema> = async (output) => {
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
        <FormischField of={form} path={["email"]}>
          {(field) => (
            <TextField
              id={`${id}-email`}
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
