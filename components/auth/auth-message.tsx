import Text from "@/components/ui/text";
import { cn } from "cn";

export function AuthMessage({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (!error && !notice) return null;

  return (
    <Text
      as="p"
      role="status"
      className={cn(
        "text-sm rounded-lg border px-3 py-2",
        error
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground",
      )}
    >
      {error ?? notice}
    </Text>
  );
}
