
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Setup observer to automatically remove stray divs that might cause UI blocking
 */
export function setupStrayDivCleaner() {
  // Setup a MutationObserver to watch for stray divs with IDs starting with "cbcb"
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && 
              node.id && 
              node.id.startsWith('cbcb')) {
            node.remove();
          }
        });
      }
    });
    
    // Also check if body has pointer-events: none and restore it
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
  });
  
  // Start observing
  observer.observe(document.body, { 
    childList: true,
    subtree: true
  });
  
  return observer;
}
