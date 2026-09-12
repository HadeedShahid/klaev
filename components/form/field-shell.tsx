import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export type FieldControl = {
  id: string;
  invalid: boolean;
  describedBy: string | undefined;
};

export type FieldShellProps = {
  id: string;
  label: string;
  errors?: readonly string[] | null;
  hint?: string;
  /** Auth screens use the placeholder as the label, so the real one is hidden. */
  hideLabel?: boolean;
  orientation?: "vertical" | "horizontal";
  children: (control: FieldControl) => React.ReactNode;
};

export function FieldShell({
  id,
  label,
  errors,
  hint,
  hideLabel = false,
  orientation = "vertical",
  children,
}: FieldShellProps) {
  const invalid = Boolean(errors && errors.length > 0);
  const describedBy = invalid ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <Field data-invalid={invalid || undefined} orientation={orientation}>
      <FieldLabel htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>

      {children({ id, invalid, describedBy })}

      {invalid ? (
        <FieldError
          id={`${id}-error`}
          errors={errors!.map((message) => ({ message }))}
        />
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>
          {hint}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
