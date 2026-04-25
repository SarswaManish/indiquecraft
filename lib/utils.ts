import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function delayedDays(promisedDate: Date | string | null | undefined): number {
  if (!promisedDate) return 0;
  const today = new Date();
  const promised = new Date(promisedDate);
  const diff = differenceInDays(today, promised);
  return diff > 0 ? diff : 0;
}

export function isOverdue(promisedDate: Date | string | null | undefined): boolean {
  return delayedDays(promisedDate) > 0;
}

export function generateOrderNumber(sequence: number): string {
  const pad = String(sequence).padStart(4, "0");
  const year = new Date().getFullYear().toString().slice(-2);
  return `ORD-${year}-${pad}`;
}

export function generateVendorRequestNumber(sequence: number): string {
  const pad = String(sequence).padStart(4, "0");
  const year = new Date().getFullYear().toString().slice(-2);
  return `VR-${year}-${pad}`;
}

export function truncate(str: string, length = 40): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function parseIntSafe(val: unknown, fallback = 0): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}
