"use client";

import * as React from "react";

import Text from "@/components/ui/text";

const WAIT_SECONDS = 60;

export function ResendNotice({
  email,
  action,
}: {
  email: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [seconds, setSeconds] = React.useState(WAIT_SECONDS);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  if (seconds > 0) {
    const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return (
      <Text as="p" className="text-sm text-muted-foreground">
        Nothing yet? Check spam, or resend in {remaining}.
      </Text>
    );
  }

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setSeconds(WAIT_SECONDS);
      }}
    >
      <input type="hidden" name="email" value={email} />
      <Text className="text-sm text-muted-foreground">
        Nothing yet? Check spam, or{" "}
        <button
          type="submit"
          className="border-border text-foreground border-b pb-px"
        >
          resend
        </button>
        .
      </Text>
    </form>
  );
}
