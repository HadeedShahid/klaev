import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Text as="h1" className="text-2xl font-semibold tracking-tight">
        Page not found
      </Text>

      <Button href="/admin" variant="outline" className="self-start">
        Back to the dashboard
      </Button>
    </main>
  );
}
