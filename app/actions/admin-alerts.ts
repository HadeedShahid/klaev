"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { TEST_PUSH } from "@/lib/alerts";
import { getDb } from "@/lib/db";
import { removeDevice, saveDevice, sendAlert, type Device } from "@/lib/push";

// The Settings card's actions for the phone it's open on (components/admin/alerts-card.tsx).

// `replaces` is this browser's previous sign-up, which its push service has dropped.
export async function saveAlertPhone(device: Device, replaces?: string | null) {
  await requireAdmin();
  const saved = await saveDevice(
    await getDb(),
    { endpoint: String(device.endpoint), p256dh: String(device.p256dh), auth: String(device.auth) },
    { replaces: replaces ? String(replaces) : undefined },
  );
  refresh();
  return saved;
}

export async function removeAlertPhone(endpoint: string) {
  await requireAdmin();
  await removeDevice(await getDb(), String(endpoint));
  refresh();
}

export async function sendTestAlert(endpoint: string) {
  await requireAdmin();
  return (await sendAlert(await getDb(), TEST_PUSH, { endpoint: String(endpoint) })) > 0;
}
