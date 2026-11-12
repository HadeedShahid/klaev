"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { TEST_PUSH } from "@/lib/alerts";
import { getDb } from "@/lib/db";
import { removeDevice, saveDevice, sendAlert, type Device } from "@/lib/push";

// The Settings card's actions for the phone it's open on (components/admin/alerts-card.tsx).

export async function saveAlertPhone(device: Device) {
  await requireAdmin();
  const saved = await saveDevice(await getDb(), { endpoint: String(device.endpoint), p256dh: String(device.p256dh), auth: String(device.auth) });
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
