// Completely override Vite's client-side HMR
(function() {
    'use strict';
    
    console.log('Vite HMR override loaded');
    
    // Disable HMR before Vite loads
    window.__VITE_HMR_DISABLE__ = true;
    
    // Override the HMR runtime completely
    Object.defineProperty(window, '__VITE_HMR_RUNTIME__', {
        value: {
            dispose: function() { console.log('HMR dispose called - ignored'); },
            accept: function() { console.log('HMR accept called - ignored'); },
            decline: function() { console.log('HMR decline called - ignored'); },
            invalidate: function() { console.log('HMR invalidate called - ignored'); },
            on: function() { console.log('HMR on called - ignored'); },
            off: function() { console.log('HMR off called - ignored'); }
        },
        writable: false,
        configurable: false
    });
    
    // Override WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        // Check if this is a Vite HMR connection
        if (url && (url.includes('vite') || url.includes('localhost:5173') || url.includes('212.179.162.102:8080') || url.includes('l.103.fm:8080'))) {
            console.log('Vite HMR WebSocket connection blocked:', url);
            
            // Create a dummy WebSocket that simulates immediate failure
            const dummy = {
                readyState: 3, // CLOSED
                url: url,
                protocol: '',
                extensions: '',
                bufferedAmount: 0,
                close: function() { console.log('Dummy WebSocket close called'); },
                send: function() { console.log('Dummy WebSocket send called'); },
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function() {}
            };
            
            // Simulate immediate close event
            setTimeout(() => {
                const closeEvent = new Event('close');
                closeEvent.code = 1000;
                closeEvent.reason = 'HMR disabled';
                closeEvent.wasClean = true;
                
                // Trigger any close handlers
                if (dummy.onclose) {
                    dummy.onclose(closeEvent);
                }
                
                // Dispatch event to any listeners
                dummy.dispatchEvent(closeEvent);
            }, 0);
            
            return dummy;
        }
        
        // For non-Vite WebSocket connections, use original
        return new OriginalWebSocket(url, protocols);
    };
    
    // Override fetch to block HMR requests
    const OriginalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url && typeof url === 'string' && (url.includes('@vite/client') || url.includes('localhost:5173'))) {
            console.log('Vite HMR fetch request blocked:', url);
            return Promise.reject(new Error('HMR disabled'));
        }
        return OriginalFetch.apply(this, arguments);
    };
    
    console.log('Vite HMR completely overridden and disabled');
})();
