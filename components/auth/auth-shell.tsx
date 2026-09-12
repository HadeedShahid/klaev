import Link from "next/link";

import Text from "@/components/ui/text";

export function AuthShell({
  title,
  description,
  mark,
  image,
  footer,
  children,
}: {
  title: string;
  description?: string;
  mark?: string;
  image?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="breakout min-h-dvh lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col">
        <div className="flex flex-1 flex-col px-7 pt-11 lg:items-center lg:justify-center lg:px-12 lg:pt-0">
          <div className="flex w-full flex-col gap-4.5 lg:max-w-sm">
            <div className="flex flex-col gap-5.5">
              {mark ? (
                <div className="flex size-13 items-center justify-center rounded-full border-2 border-foreground">
                  <Text className="text-2xl font-semibold tracking-tight">{mark}</Text>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <Text as="h1" className="text-4xl font-semibold tracking-tight lg:text-5xl">
                  {title}
                </Text>

                {description ? (
                  <Text as="p" className="text-base lg:text-lg text-muted-foreground">
                    {description}
                  </Text>
                ) : null}
              </div>
            </div>

            {children}
          </div>
        </div>

        {footer ? (
          <div className="border-border border-t px-7 pt-4.5 pb-7 lg:hidden">
            {footer}
          </div>
        ) : null}
      </div>

      {image ? (
        <div
          className="hidden items-end justify-center pb-6 lg:flex"
          style={{
            background:
              "repeating-linear-gradient(135deg,#f2f2f4 0 9px,#eaeaec 9px 18px)",
          }}
        >
          <Text className="font-mono text-xs text-muted-foreground">
            {image}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="bg-border h-px flex-1" />
      <Text className="text-sm text-muted-foreground">
        or
      </Text>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}

export function AltAction({
  text,
  href,
  label,
}: {
  text: string;
  href: string;
  label: string;
}) {
  return (
    <Text as="p" className="text-sm text-muted-foreground">
      {text}{" "}
      <Link href={href} className="border-border text-foreground border-b pb-px">
        {label}
      </Link>
    </Text>
  );
}

export function GuestBar() {
  return (
    <Link href="/">
      <Text className="text-sm text-muted-foreground">
        Continue as guest
      </Text>
    </Link>
  );
}
