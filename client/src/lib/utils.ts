import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AppUser } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to get display name from AppUser
export function getUserDisplayName(user: AppUser | any): string {
  // Handle both AppUser format and legacy formats
  if (user?.firstName) {
    return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`.trim();
  }
  if (user?.displayName) {
    return user.displayName;
  }
  if (user?.email) {
    return user.email;
  }
  return 'Unknown User';
}
