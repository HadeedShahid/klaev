import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/admin/sign-in-form";
import { isAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-[1.0625rem] font-semibold tracking-[0.28em] uppercase">Klaev</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to the admin</h1>
        </div>
        <SignInForm next={typeof next === "string" ? next : ""} />
      </div>
    </main>
  );
}
