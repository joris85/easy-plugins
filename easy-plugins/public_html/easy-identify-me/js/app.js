// Easy Identify Me - System Information Collector

// User Agent Parser
function parseUserAgent(ua) {
    const browser = {
        name: 'Unknown',
        version: 'Unknown'
    };
    const os = {
        name: 'Unknown',
        version: 'Unknown'
    };
    
    // Browser detection
    if (ua.includes('Firefox/')) {
        browser.name = 'Firefox';
        const match = ua.match(/Firefox\/(\d+\.\d+)/);
        if (match) browser.version = match[1];
    } else if (ua.includes('Chrome/') && !ua.includes('Edg')) {
        browser.name = 'Chrome';
        const match = ua.match(/Chrome\/(\d+\.\d+)/);
        if (match) browser.version = match[1];
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        browser.name = 'Safari';
        const match = ua.match(/Version\/(\d+\.\d+)/);
        if (match) browser.version = match[1];
    } else if (ua.includes('Edg/')) {
        browser.name = 'Edge';
        const match = ua.match(/Edg\/(\d+\.\d+)/);
        if (match) browser.version = match[1];
    } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
        browser.name = 'Opera';
        const match = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
        if (match) browser.version = match[1];
    }
    
    // OS detection
    if (ua.includes('Windows NT 10.0')) {
        os.name = 'Windows';
        os.version = '10/11';
    } else if (ua.includes('Windows NT 6.3')) {
        os.name = 'Windows';
        os.version = '8.1';
    } else if (ua.includes('Windows NT 6.2')) {
        os.name = 'Windows';
        os.version = '8';
    } else if (ua.includes('Windows NT 6.1')) {
        os.name = 'Windows';
        os.version = '7';
    } else if (ua.includes('Mac OS X')) {
        os.name = 'macOS';
        const match = ua.match(/Mac OS X (\d+[._]\d+)/);
        if (match) os.version = match[1].replace('_', '.');
    } else if (ua.includes('Linux')) {
        os.name = 'Linux';
    } else if (ua.includes('Android')) {
        os.name = 'Android';
        const match = ua.match(/Android (\d+\.\d+)/);
        if (match) os.version = match[1];
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
        os.name = ua.includes('iPad') ? 'iPadOS' : 'iOS';
        const match = ua.match(/OS (\d+[._]\d+)/);
        if (match) os.version = match[1].replace('_', '.');
    }
    
    return { browser, os };
}

// Device type detection
function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        return 'Tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sphone|palm|iemobile|wpdesktop/i.test(ua)) {
        return 'Mobile';
    } else {
        return 'Desktop';
    }
}

// Collect all client-side information
async function collectClientData() {
    const ua = parseUserAgent(navigator.userAgent);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    
    // Check storage support
    let localStorageSupport = false;
    let sessionStorageSupport = false;
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        localStorageSupport = true;
    } catch(e) {}
    
    try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        sessionStorageSupport = true;
    } catch(e) {}
    
    // Check IndexedDB
    const indexedDBSupport = 'indexedDB' in window;
    
    // Network connection info
    let connectionInfo = null;
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            connectionInfo = {
                type: conn.type || 'unknown',
                effectiveType: conn.effectiveType || 'unknown',
                downlink: conn.downlink ? conn.downlink + ' Mbps' : 'unknown',
                rtt: conn.rtt ? conn.rtt + ' ms' : 'unknown',
                saveData: conn.saveData ? 'Enabled' : 'Disabled'
            };
        }
    }
    
    // WebGL info
    let webglInfo = null;
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglInfo = {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                    version: gl.getParameter(gl.VERSION),
                    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
                };
            }
        }
    } catch(e) {}
    
    // Screen orientation
    let orientation = 'Unknown';
    if (screen.orientation) {
        orientation = screen.orientation.type || screen.orientation.angle + '°';
    } else if (window.orientation !== undefined) {
        orientation = window.orientation + '°';
    }
    
    // Media queries for preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // API support checks
    const apiSupport = {
        webgl: !!window.WebGLRenderingContext,
        webgl2: !!window.WebGL2RenderingContext,
        webrtc: !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection),
        webassembly: typeof WebAssembly !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        clipboard: 'clipboard' in navigator,
        fetch: typeof fetch !== 'undefined',
        websockets: 'WebSocket' in window,
        geolocation: 'geolocation' in navigator,
        vibration: 'vibrate' in navigator,
        gamepad: 'getGamepads' in navigator,
        battery: 'getBattery' in navigator
    };
    
    // Check permissions (async)
    const permissions = {};
    if ('permissions' in navigator) {
        try {
            const cameraPerm = await navigator.permissions.query({name: 'camera'}).catch(() => null);
            permissions.camera = cameraPerm ? cameraPerm.state : 'Not checked';
            
            const micPerm = await navigator.permissions.query({name: 'microphone'}).catch(() => null);
            permissions.microphone = micPerm ? micPerm.state : 'Not checked';
            
            const notifPerm = await navigator.permissions.query({name: 'notifications'}).catch(() => null);
            permissions.notifications = notifPerm ? notifPerm.state : 'Not checked';
            
            const geoPerm = await navigator.permissions.query({name: 'geolocation'}).catch(() => null);
            permissions.geolocation = geoPerm ? geoPerm.state : 'Not checked';
        } catch(e) {
            permissions.error = 'Permission API not fully supported';
        }
    }
    
    // Battery info (if available)
    let batteryInfo = null;
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            batteryInfo = {
                level: Math.round(battery.level * 100) + '%',
                charging: battery.charging ? 'Yes' : 'No',
                chargingTime: battery.chargingTime === Infinity ? 'Unknown' : Math.round(battery.chargingTime / 60) + ' minutes',
                dischargingTime: battery.dischargingTime === Infinity ? 'Unknown' : Math.round(battery.dischargingTime / 60) + ' minutes'
            };
        } catch(e) {}
    }
    
    // Media devices
    let mediaDevices = null;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput').length;
            const microphones = devices.filter(d => d.kind === 'audioinput').length;
            const speakers = devices.filter(d => d.kind === 'audiooutput').length;
            mediaDevices = {
                cameras: cameras,
                microphones: microphones,
                speakers: speakers
            };
        } catch(e) {}
    }
    
    // Client date/time
    const clientDateTime = {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timestamp: now.toISOString(),
        timezoneOffset: now.getTimezoneOffset() + ' minutes',
        isDST: (() => {
            const jan = new Date(now.getFullYear(), 0, 1);
            const jul = new Date(now.getFullYear(), 6, 1);
            return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== now.getTimezoneOffset();
        })()
    };
    
    return {
        // Display Information
        screen: {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: orientation
        },
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        
        // Browser Information
        browser: {
            name: ua.browser.name,
            version: ua.browser.version,
            language: navigator.language || 'Unknown',
            languages: navigator.languages ? navigator.languages.join(', ') : 'Unknown',
            userAgent: navigator.userAgent,
            javascriptEnabled: true
        },
        
        // Device Information
        device: {
            type: getDeviceType(),
            os: {
                name: ua.os.name,
                version: ua.os.version,
                platform: navigator.platform || 'Unknown'
            }
        },
        
        // System Information
        system: {
            timezone: timezone,
            hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
            deviceMemory: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Not available',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            clientDateTime: clientDateTime
        },
        
        // Capabilities
        capabilities: {
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || 'Not set',
            javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false
        },
        
        // Storage
        storage: {
            localStorage: localStorageSupport ? 'Supported' : 'Not supported',
            sessionStorage: sessionStorageSupport ? 'Supported' : 'Not supported',
            indexedDB: indexedDBSupport ? 'Supported' : 'Not supported'
        },
        
        // Network
        network: connectionInfo,
        
        // WebGL
        webgl: webglInfo,
        
        // API Support
        apiSupport: apiSupport,
        
        // Preferences
        preferences: {
            colorScheme: prefersDark ? 'Dark' : 'Light',
            reducedMotion: prefersReducedMotion ? 'Enabled' : 'Disabled'
        },
        
        // Permissions
        permissions: permissions,
        
        // Battery
        battery: batteryInfo,
        
        // Media Devices
        mediaDevices: mediaDevices
    };
}

// Format data for display
function formatDataForDisplay(serverData, clientData) {
    const sections = [];
    
    // Network Information
    const networkInfo = {
        title: 'Network Information',
        icon: 'fa-network-wired',
        items: [
            { label: 'IP Address', value: serverData.ip }
        ]
    };
    
    if (serverData.location && serverData.location.status === 'success') {
        if (serverData.location.country) networkInfo.items.push({ label: 'Country', value: serverData.location.country });
        if (serverData.location.regionName) networkInfo.items.push({ label: 'Region', value: serverData.location.regionName });
        if (serverData.location.city) networkInfo.items.push({ label: 'City', value: serverData.location.city });
        if (serverData.location.zip) networkInfo.items.push({ label: 'Postal Code', value: serverData.location.zip });
        if (serverData.location.isp) networkInfo.items.push({ label: 'ISP', value: serverData.location.isp });
        if (serverData.location.org) networkInfo.items.push({ label: 'Organization', value: serverData.location.org });
        if (serverData.location.timezone) networkInfo.items.push({ label: 'Timezone (IP)', value: serverData.location.timezone });
    } else {
        // Say so instead of silently showing nothing
        networkInfo.items.push({ label: 'Location', value: 'Lookup unavailable right now' });
    }

    sections.push(networkInfo);
    
    // Browser Information
    const browserItems = [
        { label: 'Browser', value: `${clientData.browser.name} ${clientData.browser.version}` },
        { label: 'JavaScript', value: clientData.browser.javascriptEnabled ? 'Enabled' : 'Disabled' },
        { label: 'Language', value: clientData.browser.language },
        { label: 'Languages', value: clientData.browser.languages },
        { label: 'User Agent', value: clientData.browser.userAgent }
    ];
    sections.push({
        title: 'Browser Information',
        icon: 'fa-globe',
        items: browserItems
    });
    
    // Device Information
    sections.push({
        title: 'Device Information',
        icon: 'fa-laptop',
        items: [
            { label: 'Device Type', value: clientData.device.type },
            { label: 'Operating System', value: `${clientData.device.os.name} ${clientData.device.os.version}` },
            { label: 'Platform', value: clientData.device.os.platform }
        ]
    });
    
    // Display Information
    const displayItems = [
        { label: 'Screen Resolution', value: `${clientData.screen.width} × ${clientData.screen.height} pixels` },
        { label: 'Available Screen', value: `${clientData.screen.availWidth} × ${clientData.screen.availHeight} pixels` },
        { label: 'Viewport Size', value: `${clientData.viewport.width} × ${clientData.viewport.height} pixels` },
        { label: 'Color Depth', value: `${clientData.screen.colorDepth} bits` },
        { label: 'Pixel Ratio', value: clientData.screen.pixelRatio },
        { label: 'Orientation', value: clientData.screen.orientation }
    ];
    sections.push({
        title: 'Display Information',
        icon: 'fa-desktop',
        items: displayItems
    });
    
    // System Information
    const systemItems = [
        { label: 'Timezone', value: clientData.system.timezone },
        { label: 'CPU Cores', value: clientData.system.hardwareConcurrency },
        { label: 'Device Memory', value: clientData.system.deviceMemory },
        { label: 'Client Date', value: clientData.system.clientDateTime.date },
        { label: 'Client Time', value: clientData.system.clientDateTime.time },
        { label: 'Timezone Offset', value: clientData.system.clientDateTime.timezoneOffset },
        { label: 'Daylight Saving', value: clientData.system.clientDateTime.isDST ? 'Yes' : 'No' }
    ];
    
    if (clientData.system.maxTouchPoints > 0) {
        systemItems.push({ label: 'Max Touch Points', value: clientData.system.maxTouchPoints });
    }
    
    sections.push({
        title: 'System Information',
        icon: 'fa-cog',
        items: systemItems
    });
    
    // Storage Information
    if (clientData.storage) {
        sections.push({
            title: 'Storage Support',
            icon: 'fa-database',
            items: [
                { label: 'Local Storage', value: clientData.storage.localStorage },
                { label: 'Session Storage', value: clientData.storage.sessionStorage },
                { label: 'IndexedDB', value: clientData.storage.indexedDB }
            ]
        });
    }
    
    // Network Information (additional)
    if (clientData.network) {
        const networkItems = [
            { label: 'Connection Type', value: clientData.network.type },
            { label: 'Effective Type', value: clientData.network.effectiveType },
            { label: 'Downlink Speed', value: clientData.network.downlink },
            { label: 'Round Trip Time', value: clientData.network.rtt },
            { label: 'Data Saver', value: clientData.network.saveData }
        ];
        sections.push({
            title: 'Network Connection',
            icon: 'fa-wifi',
            items: networkItems
        });
    }
    
    // WebGL Information
    if (clientData.webgl) {
        sections.push({
            title: 'WebGL Information',
            icon: 'fa-cube',
            items: [
                { label: 'Vendor', value: clientData.webgl.vendor },
                { label: 'Renderer', value: clientData.webgl.renderer },
                { label: 'Version', value: clientData.webgl.version },
                { label: 'GLSL Version', value: clientData.webgl.shadingLanguageVersion }
            ]
        });
    }
    
    // API Support
    if (clientData.apiSupport) {
        const apiItems = [];
        Object.keys(clientData.apiSupport).forEach(key => {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            apiItems.push({ label: label, value: clientData.apiSupport[key] ? 'Supported' : 'Not supported' });
        });
        sections.push({
            title: 'API Support',
            icon: 'fa-code',
            items: apiItems
        });
    }
    
    // Preferences
    if (clientData.preferences) {
        sections.push({
            title: 'User Preferences',
            icon: 'fa-palette',
            items: [
                { label: 'Color Scheme', value: clientData.preferences.colorScheme },
                { label: 'Reduced Motion', value: clientData.preferences.reducedMotion }
            ]
        });
    }
    
    // Permissions
    if (clientData.permissions && Object.keys(clientData.permissions).length > 0) {
        const permItems = [];
        Object.keys(clientData.permissions).forEach(key => {
            if (key !== 'error') {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                permItems.push({ label: label, value: clientData.permissions[key] });
            }
        });
        if (permItems.length > 0) {
            sections.push({
                title: 'Permissions',
                icon: 'fa-key',
                items: permItems
            });
        }
    }
    
    // Battery Information
    if (clientData.battery) {
        sections.push({
            title: 'Battery Information',
            icon: 'fa-battery-three-quarters',
            items: [
                { label: 'Level', value: clientData.battery.level },
                { label: 'Charging', value: clientData.battery.charging },
                { label: 'Charging Time', value: clientData.battery.chargingTime },
                { label: 'Discharging Time', value: clientData.battery.dischargingTime }
            ]
        });
    }
    
    // Media Devices
    if (clientData.mediaDevices) {
        const mediaItems = [];
        if (clientData.mediaDevices.cameras !== undefined) {
            mediaItems.push({ label: 'Cameras', value: clientData.mediaDevices.cameras });
        }
        if (clientData.mediaDevices.microphones !== undefined) {
            mediaItems.push({ label: 'Microphones', value: clientData.mediaDevices.microphones });
        }
        if (clientData.mediaDevices.speakers !== undefined) {
            mediaItems.push({ label: 'Speakers', value: clientData.mediaDevices.speakers });
        }
        if (mediaItems.length > 0) {
            sections.push({
                title: 'Media Devices',
                icon: 'fa-video',
                items: mediaItems
            });
        }
    }
    
    // Privacy & Settings
    sections.push({
        title: 'Privacy & Settings',
        icon: 'fa-shield-alt',
        items: [
            { label: 'Cookies Enabled', value: clientData.capabilities.cookieEnabled ? 'Yes' : 'No' },
            { label: 'Do Not Track', value: clientData.capabilities.doNotTrack === '1' ? 'Enabled' : clientData.capabilities.doNotTrack },
            { label: 'Online Status', value: clientData.capabilities.online ? 'Online' : 'Offline' },
            { label: 'Touch Support', value: clientData.capabilities.touchSupport ? 'Yes' : 'No' }
        ]
    });
    
    return sections;
}

// Format data for copying (human-readable text)
function formatDataForCopy(serverData, clientData) {
    let output = '=== SYSTEM IDENTIFICATION INFORMATION ===\n';
    output += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Network Information
    output += '=== NETWORK INFORMATION ===\n';
    output += `IP Address: ${serverData.ip}\n`;
    
    if (serverData.location && serverData.location.status === 'success') {
        if (serverData.location.country) output += `Country: ${serverData.location.country}\n`;
        if (serverData.location.regionName) output += `Region: ${serverData.location.regionName}\n`;
        if (serverData.location.city) output += `City: ${serverData.location.city}\n`;
        if (serverData.location.zip) output += `Postal Code: ${serverData.location.zip}\n`;
        if (serverData.location.isp) output += `ISP: ${serverData.location.isp}\n`;
        if (serverData.location.org) output += `Organization: ${serverData.location.org}\n`;
        if (serverData.location.timezone) output += `Timezone (IP): ${serverData.location.timezone}\n`;
    }
    output += '\n';
    
    // Browser Information
    output += '=== BROWSER INFORMATION ===\n';
    output += `Browser: ${clientData.browser.name} ${clientData.browser.version}\n`;
    output += `JavaScript: ${clientData.browser.javascriptEnabled ? 'Enabled' : 'Disabled'}\n`;
    output += `Language: ${clientData.browser.language}\n`;
    output += `Languages: ${clientData.browser.languages}\n`;
    output += `User Agent: ${clientData.browser.userAgent}\n\n`;
    
    // Device Information
    output += '=== DEVICE INFORMATION ===\n';
    output += `Device Type: ${clientData.device.type}\n`;
    output += `Operating System: ${clientData.device.os.name} ${clientData.device.os.version}\n`;
    output += `Platform: ${clientData.device.os.platform}\n\n`;
    
    // Display Information
    output += '=== DISPLAY INFORMATION ===\n';
    output += `Screen Resolution: ${clientData.screen.width} × ${clientData.screen.height} pixels\n`;
    if (clientData.screen.availWidth) output += `Available Screen: ${clientData.screen.availWidth} × ${clientData.screen.availHeight} pixels\n`;
    output += `Viewport Size: ${clientData.viewport.width} × ${clientData.viewport.height} pixels\n`;
    output += `Color Depth: ${clientData.screen.colorDepth} bits\n`;
    output += `Pixel Ratio: ${clientData.screen.pixelRatio}\n`;
    if (clientData.screen.orientation) output += `Orientation: ${clientData.screen.orientation}\n`;
    output += '\n';
    
    // System Information
    output += '=== SYSTEM INFORMATION ===\n';
    output += `Timezone: ${clientData.system.timezone}\n`;
    output += `CPU Cores: ${clientData.system.hardwareConcurrency}\n`;
    output += `Device Memory: ${clientData.system.deviceMemory}\n`;
    if (clientData.system.clientDateTime) {
        output += `Client Date: ${clientData.system.clientDateTime.date}\n`;
        output += `Client Time: ${clientData.system.clientDateTime.time}\n`;
        output += `Timezone Offset: ${clientData.system.clientDateTime.timezoneOffset}\n`;
        output += `Daylight Saving: ${clientData.system.clientDateTime.isDST ? 'Yes' : 'No'}\n`;
    }
    if (clientData.system.maxTouchPoints > 0) {
        output += `Max Touch Points: ${clientData.system.maxTouchPoints}\n`;
    }
    output += '\n';
    
    // Storage Support
    if (clientData.storage) {
        output += '=== STORAGE SUPPORT ===\n';
        output += `Local Storage: ${clientData.storage.localStorage}\n`;
        output += `Session Storage: ${clientData.storage.sessionStorage}\n`;
        output += `IndexedDB: ${clientData.storage.indexedDB}\n\n`;
    }
    
    // Network Connection
    if (clientData.network) {
        output += '=== NETWORK CONNECTION ===\n';
        output += `Connection Type: ${clientData.network.type}\n`;
        output += `Effective Type: ${clientData.network.effectiveType}\n`;
        output += `Downlink Speed: ${clientData.network.downlink}\n`;
        output += `Round Trip Time: ${clientData.network.rtt}\n`;
        output += `Data Saver: ${clientData.network.saveData}\n\n`;
    }
    
    // WebGL Information
    if (clientData.webgl) {
        output += '=== WEBGL INFORMATION ===\n';
        output += `Vendor: ${clientData.webgl.vendor}\n`;
        output += `Renderer: ${clientData.webgl.renderer}\n`;
        output += `Version: ${clientData.webgl.version}\n`;
        output += `GLSL Version: ${clientData.webgl.shadingLanguageVersion}\n\n`;
    }
    
    // API Support
    if (clientData.apiSupport) {
        output += '=== API SUPPORT ===\n';
        Object.keys(clientData.apiSupport).forEach(key => {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            output += `${label}: ${clientData.apiSupport[key] ? 'Supported' : 'Not supported'}\n`;
        });
        output += '\n';
    }
    
    // User Preferences
    if (clientData.preferences) {
        output += '=== USER PREFERENCES ===\n';
        output += `Color Scheme: ${clientData.preferences.colorScheme}\n`;
        output += `Reduced Motion: ${clientData.preferences.reducedMotion}\n\n`;
    }
    
    // Permissions
    if (clientData.permissions && Object.keys(clientData.permissions).length > 0) {
        output += '=== PERMISSIONS ===\n';
        Object.keys(clientData.permissions).forEach(key => {
            if (key !== 'error') {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                output += `${label}: ${clientData.permissions[key]}\n`;
            }
        });
        output += '\n';
    }
    
    // Battery Information
    if (clientData.battery) {
        output += '=== BATTERY INFORMATION ===\n';
        output += `Level: ${clientData.battery.level}\n`;
        output += `Charging: ${clientData.battery.charging}\n`;
        output += `Charging Time: ${clientData.battery.chargingTime}\n`;
        output += `Discharging Time: ${clientData.battery.dischargingTime}\n\n`;
    }
    
    // Media Devices
    if (clientData.mediaDevices) {
        output += '=== MEDIA DEVICES ===\n';
        if (clientData.mediaDevices.cameras !== undefined) {
            output += `Cameras: ${clientData.mediaDevices.cameras}\n`;
        }
        if (clientData.mediaDevices.microphones !== undefined) {
            output += `Microphones: ${clientData.mediaDevices.microphones}\n`;
        }
        if (clientData.mediaDevices.speakers !== undefined) {
            output += `Speakers: ${clientData.mediaDevices.speakers}\n`;
        }
        output += '\n';
    }
    
    // Privacy & Settings
    output += '=== PRIVACY & SETTINGS ===\n';
    output += `Cookies Enabled: ${clientData.capabilities.cookieEnabled ? 'Yes' : 'No'}\n`;
    output += `Do Not Track: ${clientData.capabilities.doNotTrack === '1' ? 'Enabled' : clientData.capabilities.doNotTrack}\n`;
    output += `Online Status: ${clientData.capabilities.online ? 'Online' : 'Offline'}\n`;
    output += `Touch Support: ${clientData.capabilities.touchSupport ? 'Yes' : 'No'}\n`;
    
    return output;
}

// Display information cards
function displayInformation(sections) {
    const grid = document.getElementById('infoGrid');
    grid.innerHTML = '';
    
    sections.forEach((section, index) => {
        const card = document.createElement('div');
        card.className = 'info-card';
        
        const cardHeader = `
            <div class="card-header">
                <h3><i class="fas ${section.icon} me-2"></i>${section.title}</h3>
                <button type="button" class="btn btn-sm btn-outline-secondary copy-section-btn" data-section="${index}">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        `;
        
        const cardBody = `
            <div class="card-body">
                ${section.items.map(item => {
                    const isLongText = item.label === 'User Agent' || item.label === 'Referer' || item.value.length > 80;
                    return `
                    <div class="info-item">
                        <span class="info-label">${item.label}:</span>
                        <span class="info-value ${isLongText ? 'long-text' : ''}">${item.value}</span>
                    </div>
                `;
                }).join('')}
            </div>
        `;
        
        card.innerHTML = cardHeader + cardBody;
        grid.appendChild(card);
    });
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// Show copy feedback
function showCopyFeedback(button, success) {
    const originalHTML = button.innerHTML;
    if (success) {
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('btn-success');
        button.classList.remove('btn-outline-secondary');
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-secondary');
        }, 2000);
    } else {
        button.innerHTML = '<i class="fas fa-times"></i> Failed';
        button.classList.add('btn-danger');
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-danger');
            button.classList.add('btn-outline-secondary');
        }, 2000);
    }
}

let quickCopyCurrentIP = null;

function setQuickCopyIPButton(ip, { loading = false } = {}) {
    const btn = document.getElementById('quickCopyIPBtn');
    const label = document.getElementById('quickCopyIPLabel');
    if (!btn || !label) return;

    if (loading) {
        quickCopyCurrentIP = null;
        label.textContent = 'Fetching IP…';
        btn.disabled = true;
        btn.title = '';
        return;
    }

    btn.disabled = !ip;
    if (ip) {
        quickCopyCurrentIP = ip;
        label.textContent = ip.split(' (')[0];
        btn.title = 'Click to copy IP address';
    } else {
        quickCopyCurrentIP = null;
        label.textContent = 'IP unavailable';
        btn.title = '';
    }
}

function showQuickIPCopyFeedback(button, success) {
    const label = document.getElementById('quickCopyIPLabel');
    if (!label) return;

    const restoreIP = quickCopyCurrentIP ? quickCopyCurrentIP.split(' (')[0] : 'IP unavailable';

    if (success) {
        label.textContent = 'Copied!';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-success');
        setTimeout(() => {
            label.textContent = restoreIP;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
        }, 2000);
    } else {
        label.textContent = 'Copy failed';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-danger');
        setTimeout(() => {
            label.textContent = restoreIP;
            button.classList.remove('btn-danger');
            button.classList.add('btn-outline-primary');
        }, 2000);
    }
}

async function resolveDisplayIP() {
    if (serverData.isLocalhost) {
        const publicIPData = await fetchPublicIP();
        if (publicIPData?.ip) {
            return publicIPData.ip;
        }
        if (serverData.ip && serverData.ip !== 'Unknown') {
            return serverData.ip + ' (Localhost)';
        }
        return null;
    }
    return serverData.ip && serverData.ip !== 'Unknown' ? serverData.ip : null;
}

async function initializeQuickCopyIPButton() {
    if (serverData.isLocalhost) {
        setQuickCopyIPButton(null, { loading: true });
        const ip = await resolveDisplayIP();
        setQuickCopyIPButton(ip);
        return;
    }

    if (serverData.ip && serverData.ip !== 'Unknown') {
        setQuickCopyIPButton(serverData.ip);
        return;
    }

    setQuickCopyIPButton(null);
}

// Map an ipwho.is response to the ip-api-style shape the display code expects
function mapIpWhoLocation(data) {
    if (!data || data.success === false || !data.ip) {
        return null;
    }
    return {
        status: 'success',
        country: data.country || null,
        countryCode: data.country_code || null,
        regionName: data.region || null,
        city: data.city || null,
        zip: data.postal || null,
        lat: data.latitude != null ? data.latitude : null,
        lon: data.longitude != null ? data.longitude : null,
        timezone: (data.timezone && data.timezone.id) || null,
        isp: (data.connection && data.connection.isp) || null,
        org: (data.connection && data.connection.org) || null,
        as: (data.connection && data.connection.asn) ? 'AS' + data.connection.asn : null
    };
}

// Fetch public IP address (ipwho.is is keyless and HTTPS-capable)
async function fetchPublicIP() {
    try {
        const response = await fetch('https://ipwho.is/');
        const data = await response.json();
        if (data && data.ip) {
            return {
                ip: data.ip,
                location: mapIpWhoLocation(data)
            };
        }
    } catch (err) {
        // Provider unreachable; try the fallback below
    }

    try {
        // Fallback: ipify for the IP, then ipwho.is for location
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
            let location = null;
            try {
                const locResponse = await fetch('https://ipwho.is/' + encodeURIComponent(data.ip));
                location = mapIpWhoLocation(await locResponse.json());
            } catch (locErr) {
                // Location stays unavailable; IP is still useful
            }
            return {
                ip: data.ip,
                location
            };
        }
    } catch (err) {
        // Both providers failed
    }

    return null;
}

// Function to gather and display information (called after consent)
async function gatherInformation(consentBtn) {
    // Keep privacy notice visible, just show content section below it
    const contentSection = document.getElementById('contentSection');
    
    if (contentSection) {
        contentSection.style.display = 'block';
    }
    
    // Collect client data (now async)
    const clientData = await collectClientData();
    
    // If localhost, fetch public IP
    let displayData = serverData;
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Retry client-side when on localhost OR when the server-side lookup failed
    if (serverData.isLocalhost || !serverData.location) {
        // Show loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        const publicIPData = await fetchPublicIP();

        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (publicIPData) {
            displayData = {
                ip: serverData.isLocalhost ? publicIPData.ip : serverData.ip,
                isLocalhost: false,
                location: serverData.location || publicIPData.location
            };
        } else if (serverData.isLocalhost) {
            // Show localhost with note
            displayData.ip = serverData.ip + ' (Localhost - Public IP unavailable)';
        }
    }
    
    // Format and display
    const sections = formatDataForDisplay(displayData, clientData);
    displayInformation(sections);
    
    // Store formatted text for copying
    const formattedText = formatDataForCopy(displayData, clientData);
    
    // Store IP address for copying
    const currentIP = displayData.ip;
    
    // Change "Gather my information" button to "Copy All information"
    if (consentBtn) {
        // Store formatted text globally for the button
        window.formattedTextForCopy = formattedText;
        
        // Update button text and functionality
        consentBtn.disabled = false;
        consentBtn.innerHTML = '<i class="fas fa-copy me-2"></i> Copy All information';
        
        // Replace the click handler - clone button to remove old listeners
        const newBtn = consentBtn.cloneNode(true);
        consentBtn.parentNode.replaceChild(newBtn, consentBtn);
        
        // Add new click handler for copying all information
        newBtn.addEventListener('click', async () => {
            const success = await copyToClipboard(window.formattedTextForCopy);
            showCopyFeedback(newBtn, success);
        });
    }
    
    // Copy section buttons - attach listeners after display
    setTimeout(() => {
        document.querySelectorAll('.copy-section-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const sectionIndex = parseInt(this.dataset.section);
                const section = sections[sectionIndex];
                
                let sectionText = `=== ${section.title.toUpperCase()} ===\n`;
                section.items.forEach(item => {
                    sectionText += `${item.label}: ${item.value}\n`;
                });
                
                const success = await copyToClipboard(sectionText);
                showCopyFeedback(this, success);
            });
        });
    }, 0);
    
    // Store sections and formattedText in scope for copy buttons
    window.currentSections = sections;
    window.currentFormattedText = formattedText;
    
    // Button state is already updated above, no need to reset here
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeQuickCopyIPButton();

    // Quick Copy IP button (available immediately, no consent needed)
    const quickCopyIPBtn = document.getElementById('quickCopyIPBtn');
    if (quickCopyIPBtn) {
        quickCopyIPBtn.addEventListener('click', async () => {
            if (!quickCopyCurrentIP) return;

            const cleanIP = quickCopyCurrentIP.split(' (')[0];
            const success = await copyToClipboard(cleanIP);
            showQuickIPCopyFeedback(quickCopyIPBtn, success);
        });
    }
    
    // Consent button
    const consentBtn = document.getElementById('consentBtn');
    if (consentBtn) {
        consentBtn.addEventListener('click', async () => {
            // Disable button and show loading state
            consentBtn.disabled = true;
            consentBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Gathering information...';
            
            // Gather information (pass button reference to reset it)
            await gatherInformation(consentBtn);
        });
    }
    
    // Privacy information button - toggles privacy notice accordion
    const privacyInfoBtn = document.getElementById('privacyInfoBtn');
    const privacyNoticeContent = document.getElementById('privacyNoticeContent');
    
    if (privacyInfoBtn && privacyNoticeContent) {
        privacyInfoBtn.addEventListener('click', () => {
            // Toggle the accordion
            const isExpanded = privacyNoticeContent.style.display !== 'none';
            
            if (isExpanded) {
                privacyNoticeContent.style.display = 'none';
            } else {
                privacyNoticeContent.style.display = 'block';
            }
        });
    }
});

