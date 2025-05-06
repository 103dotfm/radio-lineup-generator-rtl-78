
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString("he-IL", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Add the missing setupStrayDivCleaner function
export function setupStrayDivCleaner(): void {
  // Function to clean up stray divs that might block UI interactions
  const cleanupInterval = setInterval(() => {
    const strayDivs = document.querySelectorAll('div[style*="pointer-events: none"]');
    strayDivs.forEach(div => {
      if (div.id !== 'dialog-overlay' && !div.closest('[role="dialog"]')) {
        (div as HTMLElement).style.pointerEvents = '';
      }
    });
  }, 5000);

  // Clean up the interval when the page is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanupInterval);
  });
}
