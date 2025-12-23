// Comprehensive WebSocket and Vite HMR Disabler
(function() {
    'use strict';
    
    console.log('Loading comprehensive WebSocket disabler...');
    
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket;
    
    // Create a comprehensive dummy WebSocket
    function DummyWebSocket(url, protocols) {
        console.log('WebSocket connection blocked:', url);
        
        // Create a dummy event target
        const eventTarget = document.createElement('div');
        
        // Simulate WebSocket interface
        this.readyState = 3; // CLOSED
        this.url = url;
        this.protocol = '';
        this.extensions = '';
        this.bufferedAmount = 0;
        
        // Methods that do nothing
        this.close = function() {
            console.log('Dummy WebSocket close called');
        };
        
        this.send = function(data) {
            console.log('Dummy WebSocket send called:', data);
        };
        
        // Add event listener methods
        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
        
        // Dispatch close event immediately
        setTimeout(() => {
            const closeEvent = new Event('close');
            closeEvent.code = 1000;
            closeEvent.reason = 'WebSocket disabled';
            closeEvent.wasClean = true;
            this.dispatchEvent(closeEvent);
        }, 0);
    }
    
    // Replace WebSocket with dummy version
    window.WebSocket = DummyWebSocket;
    
    // Disable Vite HMR completely
    window.__VITE_HMR_DISABLE__ = true;
    
    // Override Vite HMR runtime
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
    
    // Override fetch to block HMR requests only
    const OriginalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url && typeof url === 'string' && (
            url.includes('@vite/client') || 
            url.includes('localhost:5173') ||
            url.includes('/@vite/') ||
            url.includes('?vite=') ||
            url.includes('&vite=') ||
            url.includes('__vite_') ||
            url.includes('hmr') ||
            url.includes('hot')
        )) {
            console.log('Vite HMR fetch request blocked:', url);
            return Promise.reject(new Error('HMR disabled'));
        }
        return OriginalFetch.apply(this, arguments);
    };
    
    // Prevent any existing HMR runtime from working
    if (window.__VITE_HMR_RUNTIME__) {
        const runtime = window.__VITE_HMR_RUNTIME__;
        runtime.dispose = function() {};
        runtime.accept = function() {};
        runtime.decline = function() {};
        runtime.invalidate = function() {};
        runtime.on = function() {};
        runtime.off = function() {};
    }
    
    console.log('Comprehensive WebSocket and Vite HMR disabler loaded successfully');
})();
