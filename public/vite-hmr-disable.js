// Disable Vite HMR before it loads
(function() {
    'use strict';
    
    // Prevent Vite HMR from loading
    window.__VITE_HMR_DISABLE__ = true;
    
    // Override the HMR runtime if it exists (only if not already defined)
    if (!window.__VITE_HMR_RUNTIME__) {
        Object.defineProperty(window, '__VITE_HMR_RUNTIME__', {
            get: function() {
                return {
                    dispose: function() {},
                    accept: function() {},
                    decline: function() {},
                    invalidate: function() {},
                    on: function() {},
                    off: function() {}
                };
            },
            set: function() {},
            configurable: true
        });
    }
    
    // Prevent WebSocket connections
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        console.log('Vite HMR WebSocket connection blocked:', url);
        
        // Return a dummy WebSocket that immediately closes
        const dummy = document.createElement('div');
        dummy.readyState = 3; // CLOSED
        dummy.url = url;
        dummy.close = function() {};
        dummy.send = function() {};
        dummy.addEventListener = function() {};
        dummy.removeEventListener = function() {};
        dummy.dispatchEvent = function() {};
        
        // Simulate immediate close
        setTimeout(() => {
            if (dummy.onclose) {
                dummy.onclose({ code: 1000, reason: 'HMR disabled', wasClean: true });
            }
        }, 0);
        
        return dummy;
    };
    
    console.log('Vite HMR completely disabled');
})();
