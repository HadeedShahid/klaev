"use client";

import { useEffect, useState } from "react";

import { removeAlertPhone, saveAlertPhone, sendTestAlert } from "@/app/actions/admin-alerts";
import { Button } from "@/components/ui/button";
import { BusyLabel } from "@/components/ui/busy-label";
import { askPermission, HELPER_STUCK, PUSH_STUCK, STORE_STUCK, Stuck, within } from "@/lib/alert-steps";
import { cn } from "@/lib/utils";

// Alerts on the phone this page is open on: it asks to show notifications, signs the phone up with
// its browser's push service under the store's key, and tells the store where to send (lib/push.ts).
// public/admin/sw.js shows each alert. Every phone turns them on, tests and turns them off for itself.
// Each step has an end (lib/alert-steps.ts), so a button never spins for good: it says what got stuck.

type State = "checking" | "iphone" | "unsupported" | "blocked" | "off" | "on";
type Note = { text: string; error?: boolean } | null;

const SCOPE = "/admin/";
// The address this browser last signed up with, so a new one replaces it and a dropped one is let go.
// On Android, Chrome and the installed app share it, as they share the sign-up.
const LAST = "klaev-alerts-endpoint";
const lastEndpoint = () => {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
};
const remember = (endpoint: string | null) => {
  try {
    if (endpoint) localStorage.setItem(LAST, endpoint);
    else localStorage.removeItem(LAST);
  } catch {}
};
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
        const granted = Notification.permission === "granted";
        const subscription = granted ? await currentSubscription() : null;
        const last = lastEndpoint();
        if (subscription && sameKey(subscription, fromB64url(publicKey))) {
          // Already on here: make sure the store has this phone, and only once.
          const saved = await within(saveAlertPhone(deviceOf(subscription), last), 15, STORE_STUCK);
          if (saved.ok) remember(subscription.endpoint);
          next = saved.ok ? "on" : "off";
        } else {
          // The browser dropped the sign-up it had: the store lets it go too.
          if (granted && last) {
            await within(removeAlertPhone(last), 15, STORE_STUCK);
            remember(null);
          }
          next = "off";
        }
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
      const permission = await askPermission(() => Notification.requestPermission(), () => Notification.permission);
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        if (permission === "default") setNote({ text: "Notifications weren't allowed. Tap Turn on alerts and choose Allow.", error: true });
        return;
      }
      const registration = await within(
        navigator.serviceWorker.register(`${SCOPE}sw.js`, { scope: SCOPE, updateViaCache: "none" }).then(() => navigator.serviceWorker.ready),
        15,
        HELPER_STUCK,
      );
      const key = fromB64url(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, key)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      // A browser's first sign-up with its push service can take half a minute.
      subscription ??= await within(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), 60, PUSH_STUCK).catch((error) => {
        throw error instanceof Stuck ? error : new Stuck(`Google's push service didn't take this phone (${error instanceof Error ? error.message : error}). Refresh the page and try again.`);
      });
      const saved = await within(saveAlertPhone(deviceOf(subscription), lastEndpoint()), 15, STORE_STUCK);
      if (!saved.ok) throw new Stuck(saved.message);
      remember(subscription.endpoint);
      setState("on");
      setNote({ text: "Alerts are on. Send a test to see one." });
    } catch (error) {
      setNote({ text: error instanceof Stuck ? error.message : "Alerts didn't turn on. Refresh the page and try again.", error: true });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setNote(null);
    try {
      const subscription = await currentSubscription();
      const sent = subscription ? await within(sendTestAlert(subscription.endpoint), 20, STORE_STUCK) : false;
      setNote(
        sent
          ? { text: "Sent. It shows on this phone in a few seconds." }
          : { text: "It didn't reach this phone. Wait a few seconds and send another; if that doesn't arrive either, turn alerts off and on again.", error: true },
      );
    } catch (error) {
      setNote({ text: error instanceof Stuck ? error.message : "It didn't send. Check the phone has internet, then try again.", error: true });
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
        await within(removeAlertPhone(subscription.endpoint), 15, STORE_STUCK);
        await subscription.unsubscribe();
      }
      remember(null);
      setState("off");
      setNote({ text: "Alerts are off for this phone." });
    } catch (error) {
      setNote({ text: error instanceof Stuck ? error.message : "Alerts didn't turn off. Try again.", error: true });
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
