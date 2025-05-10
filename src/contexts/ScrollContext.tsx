
import React, { createContext, useContext, useState, useRef } from 'react';

interface ScrollContextType {
  saveScrollPosition: () => number;
  restoreScrollPosition: (position?: number) => void;
  currentScrollPosition: React.MutableRefObject<number>;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const scrollPositionRef = useRef<number>(0);

  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
    return scrollPositionRef.current;
  };

  const restoreScrollPosition = (position?: number) => {
    const scrollToPosition = position !== undefined ? position : scrollPositionRef.current;
    
    // Use requestAnimationFrame to ensure the scroll happens after React updates
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollToPosition,
        behavior: 'instant'
      });
      
      // Double-check the scroll position after a small delay
      setTimeout(() => {
        if (Math.abs(window.scrollY - scrollToPosition) > 10) {
          window.scrollTo({
            top: scrollToPosition,
            behavior: 'instant'
          });
        }
      }, 50);
    });
  };

  return (
    <ScrollContext.Provider value={{ 
      saveScrollPosition, 
      restoreScrollPosition,
      currentScrollPosition: scrollPositionRef
    }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
