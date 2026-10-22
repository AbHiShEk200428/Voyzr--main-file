import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "N/A";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Error";
  }
}

export function formatDateRange(startDate: string | undefined | null, endDate: string | undefined | null): string {
  if (!startDate && !endDate) return "No dates set";
  if (!endDate) return formatDate(startDate);
  if (!startDate) return formatDate(endDate);
  
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === end) return start;
  return `${start} - ${end}`;
}

export function getStatusColor(
  status: string
): string {
  switch (status) {
    case "UPCOMING":
    case "Planning":
      return "bg-blue-50 text-blue-600";
    case "LIVE":
    case "Ongoing":
      return "bg-green-50 text-green-700";
    case "COMPLETED":
      return "bg-slate-100 text-slate-700";
    case "CANCELLED":
      return "bg-red-50 text-red-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
