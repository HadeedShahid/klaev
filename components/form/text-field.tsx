"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";

import { FieldShell, type FieldShellProps } from "@/components/form/field-shell";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type TextFieldProps = Omit<FieldShellProps, "children"> & {
  value: string;
  inputProps: React.ComponentProps<"input">;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  trailing?: React.ReactNode;
};

export function TextField({
  value,
  inputProps,
  type = "text",
  autoComplete,
  trailing,
  hideLabel = true,
  ...shell
}: TextFieldProps) {
  return (
    <FieldShell {...shell} hideLabel={hideLabel}>
      {({ id, invalid, describedBy }) => (
        <div className="relative">
          <Input
            {...inputProps}
            id={id}
            type={type}
            value={value}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            autoComplete={autoComplete}
            placeholder={shell.label}
            className={cn("truncate", trailing && "pr-12")}
          />

          {trailing ? (
            <div className="absolute inset-y-0 right-4 flex items-center">
              {trailing}
            </div>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

export function PasswordField({
  label,
  ...props
}: Omit<TextFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <TextField
      {...props}
      label={label}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((shown) => !shown)}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {visible ? (
            <EyeOffIcon className="size-5" />
          ) : (
            <EyeIcon className="size-5" />
          )}
        </button>
      }
    />
  );
}
