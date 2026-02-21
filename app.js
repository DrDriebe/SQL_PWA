// ============================================================
// PWA Demo App - Android Features Showcase
// ============================================================

// --- Utility: Toast Notification ---
function showToast(msg, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}

// --- Utility: Support Badge ---
function setSupport(id, supported) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = supported ? 'Verfuegbar' : 'Nicht verfuegbar';
    el.className = 'support-badge ' + (supported ? 'supported' : 'unsupported');
}

// ============================================================
// 1. Service Worker Registration
// ============================================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.warn('SW registration failed:', err));
}

// ============================================================
// 2. Install Prompt (A2HS)
// ============================================================
let deferredPrompt = null;
const installSection = document.getElementById('install-section');
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installSection.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    showToast(result.outcome === 'accepted' ? 'App wird installiert!' : 'Installation abgebrochen');
    deferredPrompt = null;
    installSection.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
    showToast('App erfolgreich installiert!');
    installSection.style.display = 'none';
});

// ============================================================
// 3. Network Status
// ============================================================
const networkBadge = document.getElementById('network-badge');

function updateNetworkStatus() {
    const online = navigator.onLine;
    networkBadge.textContent = online ? 'Online' : 'Offline';
    networkBadge.className = 'badge ' + (online ? 'online' : 'offline');
    if (!online) showToast('Du bist offline - die App funktioniert trotzdem!');
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

// ============================================================
// 4. Camera
// ============================================================
setSupport('camera-support', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

const cameraPreview = document.getElementById('camera-preview');
const cameraCanvas = document.getElementById('camera-canvas');
const cameraResult = document.getElementById('camera-result');
const cameraSnapBtn = document.getElementById('camera-snap-btn');
const cameraStopBtn = document.getElementById('camera-stop-btn');
let cameraStream = null;

document.getElementById('camera-photo-btn').addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        cameraSnapBtn.style.display = 'inline-flex';
        cameraStopBtn.style.display = 'inline-flex';
        cameraResult.style.display = 'none';
        showToast('Kamera gestartet');
    } catch (err) {
        showToast('Kamera-Zugriff verweigert: ' + err.message);
    }
});

document.getElementById('camera-video-btn').addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
        });
        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = 'block';
        cameraStopBtn.style.display = 'inline-flex';
        cameraSnapBtn.style.display = 'inline-flex';
        showToast('Kamera + Mikrofon gestartet');
    } catch (err) {
        showToast('Zugriff verweigert: ' + err.message);
    }
});

cameraSnapBtn.addEventListener('click', () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    const settings = track.getSettings();
    cameraCanvas.width = settings.width || cameraPreview.videoWidth;
    cameraCanvas.height = settings.height || cameraPreview.videoHeight;
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraPreview, 0, 0, cameraCanvas.width, cameraCanvas.height);
    cameraResult.src = cameraCanvas.toDataURL('image/jpeg', 0.9);
    cameraResult.style.display = 'block';
    showToast('Foto aufgenommen!');
});

cameraStopBtn.addEventListener('click', stopCamera);

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    cameraPreview.style.display = 'none';
    cameraSnapBtn.style.display = 'none';
    cameraStopBtn.style.display = 'none';
    cameraPreview.srcObject = null;
}

// ============================================================
// 5. Geolocation
// ============================================================
setSupport('geo-support', 'geolocation' in navigator);

document.getElementById('geo-btn').addEventListener('click', () => {
    const resultBox = document.getElementById('geo-result');
    resultBox.style.display = 'block';
    resultBox.innerHTML = 'Position wird ermittelt...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy, altitude, speed } = pos.coords;
            resultBox.innerHTML = `
                <strong>Breitengrad:</strong> ${latitude.toFixed(6)}<br>
                <strong>Laengengrad:</strong> ${longitude.toFixed(6)}<br>
                <strong>Genauigkeit:</strong> ${accuracy.toFixed(0)} m<br>
                ${altitude !== null ? `<strong>Hoehe:</strong> ${altitude.toFixed(1)} m<br>` : ''}
                ${speed !== null ? `<strong>Geschwindigkeit:</strong> ${(speed * 3.6).toFixed(1)} km/h<br>` : ''}
                <br><a href="https://www.openstreetmap.org/#map=16/${latitude}/${longitude}"
                   target="_blank" rel="noopener" style="color:var(--accent);">
                   Auf Karte anzeigen &rarr;</a>
            `;
            showToast('Position gefunden!');
        },
        (err) => {
            resultBox.innerHTML = `<span style="color:var(--error)">Fehler: ${err.message}</span>`;
            showToast('Position konnte nicht ermittelt werden');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

// ============================================================
// 6. Vibration
// ============================================================
setSupport('vibration-support', 'vibrate' in navigator);

document.getElementById('vib-short-btn').addEventListener('click', () => {
    navigator.vibrate(100);
    showToast('Kurze Vibration');
});

document.getElementById('vib-long-btn').addEventListener('click', () => {
    navigator.vibrate(500);
    showToast('Lange Vibration');
});

document.getElementById('vib-pattern-btn').addEventListener('click', () => {
    navigator.vibrate([100, 50, 100, 50, 200, 100, 300]);
    showToast('Vibrationsmuster');
});

document.getElementById('vib-sos-btn').addEventListener('click', () => {
    // SOS in Morse: ... --- ...
    const dot = 100, dash = 300, gap = 100, letterGap = 300;
    navigator.vibrate([
        dot, gap, dot, gap, dot,       // S
        letterGap,
        dash, gap, dash, gap, dash,    // O
        letterGap,
        dot, gap, dot, gap, dot        // S
    ]);
    showToast('SOS Vibration (Morse)');
});

// ============================================================
// 7. Notifications
// ============================================================
setSupport('notify-support', 'Notification' in window);

const notifyStatus = document.getElementById('notify-status');
const notifySendBtn = document.getElementById('notify-send-btn');

function updateNotifyStatus() {
    if (!('Notification' in window)) {
        notifyStatus.textContent = 'Benachrichtigungen werden nicht unterstuetzt';
        return;
    }
    notifyStatus.textContent = 'Status: ' + Notification.permission;
    notifySendBtn.disabled = Notification.permission !== 'granted';
}
updateNotifyStatus();

document.getElementById('notify-permission-btn').addEventListener('click', async () => {
    const result = await Notification.requestPermission();
    updateNotifyStatus();
    showToast('Berechtigung: ' + result);
});

notifySendBtn.addEventListener('click', () => {
    if (Notification.permission !== 'granted') return;

    const options = {
        body: 'Das ist eine lokale Benachrichtigung von deiner PWA Demo App!',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-72.png',
        vibrate: [200, 100, 200],
        tag: 'demo-notification',
        actions: [
            { action: 'open', title: 'Oeffnen' },
            { action: 'close', title: 'Schliessen' }
        ]
    };

    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification('PWA Demo', options);
        });
    } else {
        new Notification('PWA Demo', options);
    }
    showToast('Benachrichtigung gesendet!');
});

// ============================================================
// 8. Device Sensors (Accelerometer + Gyroscope)
// ============================================================
setSupport('sensors-support', 'DeviceMotionEvent' in window);

let sensorsActive = false;

function handleMotion(e) {
    const acc = e.accelerationIncludingGravity || {};
    document.getElementById('accel-x').textContent = (acc.x || 0).toFixed(2);
    document.getElementById('accel-y').textContent = (acc.y || 0).toFixed(2);
    document.getElementById('accel-z').textContent = (acc.z || 0).toFixed(2);
}

function handleOrientation(e) {
    document.getElementById('orient-alpha').textContent = (e.alpha || 0).toFixed(1) + '\u00B0';
    document.getElementById('orient-beta').textContent = (e.beta || 0).toFixed(1) + '\u00B0';
    document.getElementById('orient-gamma').textContent = (e.gamma || 0).toFixed(1) + '\u00B0';

    // Update 3D phone visual
    const phone = document.getElementById('phone-3d');
    if (phone) {
        const beta = Math.max(-45, Math.min(45, e.beta || 0));
        const gamma = Math.max(-45, Math.min(45, e.gamma || 0));
        phone.style.transform = `rotateX(${-beta}deg) rotateY(${gamma}deg)`;
    }
}

document.getElementById('sensors-btn').addEventListener('click', async () => {
    const btn = document.getElementById('sensors-btn');

    if (sensorsActive) {
        window.removeEventListener('devicemotion', handleMotion);
        window.removeEventListener('deviceorientation', handleOrientation);
        sensorsActive = false;
        btn.textContent = 'Sensoren aktivieren';
        btn.classList.remove('active');
        document.getElementById('sensors-result').style.display = 'none';
        document.getElementById('sensor-visual').style.display = 'none';
        showToast('Sensoren deaktiviert');
        return;
    }

    // iOS 13+ needs permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const response = await DeviceMotionEvent.requestPermission();
            if (response !== 'granted') {
                showToast('Sensor-Berechtigung verweigert');
                return;
            }
        } catch (err) {
            showToast('Fehler: ' + err.message);
            return;
        }
    }

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);
    sensorsActive = true;
    btn.textContent = 'Sensoren deaktivieren';
    btn.classList.add('active');
    document.getElementById('sensors-result').style.display = 'block';
    document.getElementById('sensor-visual').style.display = 'block';
    showToast('Sensoren aktiviert - bewege dein Geraet!');
});

// ============================================================
// 9. Share API
// ============================================================
setSupport('share-support', 'share' in navigator);

document.getElementById('share-btn').addEventListener('click', async () => {
    if (!navigator.share) {
        showToast('Web Share API nicht verfuegbar');
        return;
    }
    try {
        await navigator.share({
            title: 'PWA Demo App',
            text: 'Schau dir an, was Progressive Web Apps auf Android alles koennen!',
            url: window.location.href
        });
        showToast('Erfolgreich geteilt!');
    } catch (err) {
        if (err.name !== 'AbortError') {
            showToast('Teilen fehlgeschlagen: ' + err.message);
        }
    }
});

// ============================================================
// 10. Clipboard API
// ============================================================
setSupport('clipboard-support', !!(navigator.clipboard && navigator.clipboard.writeText));

document.getElementById('clipboard-copy-btn').addEventListener('click', async () => {
    const text = document.getElementById('clipboard-input').value;
    if (!text) {
        showToast('Bitte Text eingeben');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('In Zwischenablage kopiert!');
    } catch (err) {
        showToast('Kopieren fehlgeschlagen: ' + err.message);
    }
});

document.getElementById('clipboard-paste-btn').addEventListener('click', async () => {
    const resultBox = document.getElementById('clipboard-result');
    try {
        const text = await navigator.clipboard.readText();
        resultBox.style.display = 'block';
        resultBox.textContent = text || '(leer)';
        showToast('Aus Zwischenablage eingefuegt!');
    } catch (err) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `<span style="color:var(--error)">Zugriff verweigert: ${err.message}</span>`;
    }
});

// ============================================================
// 11. Wake Lock API
// ============================================================
setSupport('wakelock-support', 'wakeLock' in navigator);

let wakeLock = null;
const wakeLockBtn = document.getElementById('wakelock-btn');
const wakeLockStatus = document.getElementById('wakelock-status');

wakeLockBtn.addEventListener('click', async () => {
    if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
        wakeLockBtn.textContent = 'Wake Lock aktivieren';
        wakeLockBtn.classList.remove('active');
        wakeLockStatus.textContent = 'Bildschirm kann sich wieder ausschalten';
        showToast('Wake Lock deaktiviert');
        return;
    }

    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLockBtn.textContent = 'Wake Lock deaktivieren';
        wakeLockBtn.classList.add('active');
        wakeLockStatus.textContent = 'Bildschirm bleibt an!';
        showToast('Wake Lock aktiviert - Bildschirm bleibt an');

        wakeLock.addEventListener('release', () => {
            wakeLock = null;
            wakeLockBtn.textContent = 'Wake Lock aktivieren';
            wakeLockBtn.classList.remove('active');
            wakeLockStatus.textContent = 'Wake Lock wurde freigegeben';
        });
    } catch (err) {
        wakeLockStatus.textContent = 'Fehler: ' + err.message;
        showToast('Wake Lock fehlgeschlagen');
    }
});

// Re-acquire wake lock on visibility change
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            // silently fail
        }
    }
});

// ============================================================
// 12. Battery Status API
// ============================================================
setSupport('battery-support', 'getBattery' in navigator);

document.getElementById('battery-btn').addEventListener('click', async () => {
    const resultBox = document.getElementById('battery-result');
    const fillBar = document.getElementById('battery-fill');
    const percentText = document.getElementById('battery-percent');
    const details = document.getElementById('battery-details');

    if (!navigator.getBattery) {
        showToast('Battery API nicht verfuegbar');
        return;
    }

    try {
        const battery = await navigator.getBattery();
        resultBox.style.display = 'block';

        function updateBattery() {
            const level = Math.round(battery.level * 100);
            fillBar.style.width = level + '%';
            percentText.textContent = level + '%';

            if (level <= 20) {
                fillBar.style.background = 'linear-gradient(90deg, var(--error), #ff5252)';
            } else if (level <= 50) {
                fillBar.style.background = 'linear-gradient(90deg, var(--warning), #ffb74d)';
            } else {
                fillBar.style.background = 'linear-gradient(90deg, var(--success), var(--accent))';
            }

            let chargingTime = battery.chargingTime;
            let dischargingTime = battery.dischargingTime;

            details.innerHTML = `
                <div class="sensor-item">
                    <span class="sensor-label">Ladestatus</span>
                    <span class="sensor-value" style="color:${battery.charging ? 'var(--success)' : 'var(--warning)'}">
                        ${battery.charging ? 'Laedt' : 'Entlaedt'}
                    </span>
                </div>
                <div class="sensor-item">
                    <span class="sensor-label">Ladestand</span>
                    <span class="sensor-value">${level}%</span>
                </div>
                ${chargingTime !== Infinity ? `
                <div class="sensor-item">
                    <span class="sensor-label">Voll in</span>
                    <span class="sensor-value">${Math.round(chargingTime / 60)} Min</span>
                </div>` : ''}
                ${dischargingTime !== Infinity ? `
                <div class="sensor-item">
                    <span class="sensor-label">Leer in</span>
                    <span class="sensor-value">${Math.round(dischargingTime / 60)} Min</span>
                </div>` : ''}
            `;
        }

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        showToast('Batteriestatus geladen');
    } catch (err) {
        showToast('Fehler: ' + err.message);
    }
});

// ============================================================
// 13. Device Info
// ============================================================
document.getElementById('device-btn').addEventListener('click', () => {
    const resultBox = document.getElementById('device-result');
    resultBox.style.display = 'block';

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    resultBox.innerHTML = `
        <strong>User Agent:</strong><br>
        <span style="font-size:0.75rem;color:rgba(255,255,255,0.5)">${navigator.userAgent}</span><br><br>
        <strong>Plattform:</strong> ${navigator.platform || 'Unbekannt'}<br>
        <strong>Sprache:</strong> ${navigator.language}<br>
        <strong>Bildschirm:</strong> ${screen.width} x ${screen.height} (${window.devicePixelRatio}x DPR)<br>
        <strong>Viewport:</strong> ${window.innerWidth} x ${window.innerHeight}<br>
        <strong>Farbtiefe:</strong> ${screen.colorDepth} Bit<br>
        <strong>CPU Kerne:</strong> ${navigator.hardwareConcurrency || 'Unbekannt'}<br>
        <strong>Max RAM:</strong> ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Unbekannt'}<br>
        <strong>Touch:</strong> ${navigator.maxTouchPoints || 0} Touchpoints<br>
        <strong>Cookies:</strong> ${navigator.cookieEnabled ? 'Aktiviert' : 'Deaktiviert'}<br>
        <strong>Online:</strong> ${navigator.onLine ? 'Ja' : 'Nein'}<br>
        ${connection ? `
        <strong>Verbindung:</strong> ${connection.effectiveType || 'Unbekannt'}<br>
        <strong>Downlink:</strong> ${connection.downlink || '?'} Mbps<br>
        <strong>RTT:</strong> ${connection.rtt || '?'} ms<br>
        <strong>Data Saver:</strong> ${connection.saveData ? 'Aktiv' : 'Inaktiv'}<br>
        ` : ''}
        <strong>Standalone PWA:</strong> ${window.matchMedia('(display-mode: standalone)').matches ? 'Ja' : 'Nein'}<br>
        <strong>Service Worker:</strong> ${'serviceWorker' in navigator ? 'Verfuegbar' : 'Nicht verfuegbar'}<br>
    `;
    showToast('Geraeteinfo geladen');
});

// ============================================================
// 14. Fullscreen API
// ============================================================
setSupport('fullscreen-support', !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen));

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        showToast('Vollbild beendet');
    } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        showToast('Vollbild aktiviert');
    }
});

// ============================================================
// 15. Screen Orientation API
// ============================================================
setSupport('orientation-support', !!(screen.orientation && screen.orientation.lock));

const orientCurrent = document.getElementById('orientation-current');

function updateOrientationDisplay() {
    if (screen.orientation) {
        orientCurrent.textContent = 'Aktuell: ' + screen.orientation.type + ' (' + screen.orientation.angle + '\u00B0)';
    }
}
updateOrientationDisplay();
if (screen.orientation) {
    screen.orientation.addEventListener('change', updateOrientationDisplay);
}

document.getElementById('orient-portrait-btn').addEventListener('click', async () => {
    try {
        await screen.orientation.lock('portrait');
        showToast('Portrait gesperrt');
    } catch (err) {
        showToast('Konnte nicht sperren: ' + err.message);
    }
});

document.getElementById('orient-landscape-btn').addEventListener('click', async () => {
    try {
        await screen.orientation.lock('landscape');
        showToast('Landscape gesperrt');
    } catch (err) {
        showToast('Konnte nicht sperren: ' + err.message);
    }
});

document.getElementById('orient-unlock-btn').addEventListener('click', () => {
    try {
        screen.orientation.unlock();
        showToast('Orientierung entsperrt');
    } catch (err) {
        showToast('Fehler: ' + err.message);
    }
});

// ============================================================
// Feature Support Check on Load
// ============================================================
window.addEventListener('load', () => {
    console.log('PWA Demo App loaded');
    // Show install banner hint on desktop
    if (!deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        // Install section stays hidden until beforeinstallprompt fires
    }
});
