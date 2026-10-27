"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { applyTheme, getTheme, setTheme, subscribeTheme, type ThemeChoice } from "@/lib/admin-theme";

const useTheme = () => useSyncExternalStore(subscribeTheme, getTheme, () => "system" as ThemeChoice);

// Keeps the admin in the chosen theme while it's open, following the system when that's the choice,
// and hands the page back light when you leave the admin for the store.
export function AdminTheme() {
  const theme = useTheme();
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => () => document.documentElement.classList.remove("dark"), []);
  return null;
}

const CHOICES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match this computer", icon: Monitor },
];

// In the sidebar's foot: light, dark, or whatever the computer is set to.
export function ThemeMenu() {
  const theme = useTheme();
  const current = CHOICES.find((choice) => choice.value === theme) ?? CHOICES[2];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton />}>
        <current.icon strokeWidth={1.8} aria-hidden />
        <span>Appearance</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-52">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeChoice)}>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          {CHOICES.map((choice) => (
            <DropdownMenuRadioItem key={choice.value} value={choice.value}>
              <choice.icon strokeWidth={1.8} aria-hidden />
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
