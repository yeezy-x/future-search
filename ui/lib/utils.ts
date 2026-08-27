import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const formatTimeDifference = (now: Date, then: Date): string => {
  const diffInSeconds = Math.floor(
    Math.abs(now.getTime() - then.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(diffInSeconds / 3600);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(diffInSeconds / 86400);
  if (days < 365) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} year${years !== 1 ? "s" : ""}`;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}