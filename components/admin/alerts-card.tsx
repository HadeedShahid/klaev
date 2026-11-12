"use client";

import { useEffect, useState } from "react";

import { removeAlertPhone, saveAlertPhone, sendTestAlert } from "@/app/actions/admin-alerts";
import { Button } from "@/components/ui/button";
import { BusyLabel } from "@/components/ui/busy-label";
import { cn } from "@/lib/utils";

// Alerts on the phone this page is open on: it asks to show notifications, signs the phone up with
// its browser's push service under the store's key, and tells the store where to send (lib/push.ts).
// public/admin/sw.js shows each alert. Every phone turns them on, tests and turns them off for itself.

type State = "checking" | "iphone" | "unsupported" | "blocked" | "off" | "on";
type Note = { text: string; error?: boolean } | null;

const SCOPE = "/admin/";
const fromB64url = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));

function deviceOf(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  return { endpoint: endpoint ?? "", p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" };
}

// A phone signed up under another key (a store reset, say) has to sign up again.
function sameKey(subscription: PushSubscription, key: Uint8Array) {
  const current = subscription.options.applicationServerKey;
  return current !== null && new Uint8Array(current).every((byte, index) => byte === key[index]) && current.byteLength === key.length;
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SCOPE);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export function AlertsCard({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState<"on" | "test" | "off" | null>(null);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "iphone" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "blocked";
      } else {
        const subscription = Notification.permission === "granted" ? await currentSubscription() : null;
        // Already on here: make sure the store still has this phone.
        if (subscription && sameKey(subscription, fromB64url(publicKey)) && (await saveAlertPhone(deviceOf(subscription))).ok) next = "on";
        else next = "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("off"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function turnOn() {
    setBusy("on");
    setNote(null);
    try {
      // Asked first, while the tap still counts as the reason for asking.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      await navigator.serviceWorker.register(`${SCOPE}sw.js`, { scope: SCOPE, updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;
      const key = fromB64url(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, key)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const saved = await saveAlertPhone(deviceOf(subscription));
      if (!saved.ok) throw new Error(saved.message);
      setState("on");
      setNote({ text: "Alerts are on. Send a test to see one." });
    } catch {
      setNote({ text: "Alerts didn't turn on. Check the phone has internet and isn't saving data, then try again.", error: true });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setNote(null);
    try {
      const subscription = await currentSubscription();
      const sent = subscription ? await sendTestAlert(subscription.endpoint) : false;
      setNote(
        sent
          ? { text: "Sent. It shows on this phone in a few seconds." }
          : { text: "It didn't reach this phone. Turn alerts off and on again.", error: true },
      );
    } catch {
      setNote({ text: "It didn't send. Check the phone has internet, then try again.", error: true });
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    setBusy("off");
    setNote(null);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await removeAlertPhone(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
      setNote({ text: "Alerts are off for this phone." });
    } catch {
      setNote({ text: "Alerts didn't turn off. Try again.", error: true });
    } finally {
      setBusy(null);
    }
  }

  const status =
    state === "iphone"
      ? "On iPhone, add the admin to your Home Screen from Safari's Share menu, then open it from there to turn alerts on."
      : state === "unsupported"
        ? "This browser can't show alerts. On Android, open the admin in Chrome."
        : state === "blocked"
          ? "Notifications are blocked for this site. Allow them in the browser's site settings for klaev.com, then come back."
          : state === "on"
            ? "On for this phone."
            : null;

  return (
    <div className="flex flex-col gap-4">
      {status ? <p className="text-sm">{status}</p> : null}
      {state === "off" || state === "checking" ? (
        <div>
          <Button type="button" variant="outline" aria-busy={busy === "on"} disabled={state === "checking" || busy !== null} onClick={turnOn}>
            <BusyLabel busy={busy === "on"} busyText="Turning on">
              Turn on alerts
            </BusyLabel>
          </Button>
        </div>
      ) : null}
      {state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" aria-busy={busy === "test"} disabled={busy !== null} onClick={test}>
            <BusyLabel busy={busy === "test"} busyText="Sending">
              Send a test
            </BusyLabel>
          </Button>
          <Button type="button" variant="ghost" aria-busy={busy === "off"} disabled={busy !== null} onClick={turnOff}>
            <BusyLabel busy={busy === "off"} busyText="Turning off">
              Turn off
            </BusyLabel>
          </Button>
        </div>
      ) : null}
      {note ? (
        <p role={note.error ? "alert" : "status"} className={cn("text-sm", note.error ? "text-destructive" : "text-muted-foreground")}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
