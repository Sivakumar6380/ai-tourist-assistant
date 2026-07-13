/* ================================================
   SafeTravel AI — Emergency SOS System
   ================================================ */

const SOS = {
    isActive: false,
    holdTimer: null,
    holdStart: 0,
    cancelTimer: null,
    cancelCountdown: 10,

    init() {
        const btn = document.getElementById('sos-btn');
        if (!btn) return;

        // Instant click activation for absolute reliability on both desktop & mobile touch devices
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.activateSOS();
        });

        // Cancel button
        const cancelBtn = document.getElementById('sos-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelSOS());
        }
    },

    startHold() {
        // Kept for backward compatibility but unused
    },

    cancelHold() {
        // Kept for backward compatibility but unused
    },

    activateSOS(reason = null) {
        if (this.isActive) return;
        this.isActive = true;
        const btn = document.getElementById('sos-btn');
        if (btn) btn.classList.remove('holding');

        // Get current location with robust fallbacks
        const pos = GPS.getCurrentCoords();
        const tourist = Auth.currentUser;
        
        const fallbackLat = tourist?.lat || 28.6120;
        const fallbackLng = tourist?.lng || 77.2090;
        const currentLat = pos?.lat || fallbackLat;
        const currentLng = pos?.lng || fallbackLng;

        const alertMsg = reason 
            ? `SOS Emergency activated — Reason: ${reason}`
            : `SOS Emergency activated by ${tourist?.name || 'Tourist'}`;

        // Create SOS alert
        const alert = {
            id: 'SOS' + Utils.uid(),
            touristId: tourist?.id || 'GUEST',
            type: 'sos',
            riskScore: 100,
            message: alertMsg,
            lat: currentLat,
            lng: currentLng,
            status: 'active',
            timestamp: Date.now()
        };

        DB.saveAlert(alert);

        // Show SOS modal
        this.showSOSModal({ lat: currentLat, lng: currentLng }, tourist, reason);

        // Simulate notifying contacts
        this.simulateNotifications();

        if (window.Features && typeof Features.updateInsuranceStatus === 'function') {
            Features.updateInsuranceStatus();
        }

        Utils.toast('🆘 SOS ACTIVATED', alertMsg, 'danger', 10000);
    },

    showSOSModal(pos, tourist, reason = null) {
        const modal = document.getElementById('sos-modal');
        if (modal) modal.classList.remove('hidden');

        // Location info
        const locInfo = document.getElementById('sos-location-info');
        if (locInfo) {
            const latitude = pos?.lat || 28.6120;
            const longitude = pos?.lng || 77.2090;
            locInfo.innerHTML = `
                <strong>📍 Emergency Location</strong><br>
                Latitude: ${latitude.toFixed(6)}<br>
                Longitude: ${longitude.toFixed(6)}<br>
                Time: ${Utils.formatDateTime(Date.now())}<br>
                Tourist: ${tourist?.name || 'Unknown'}<br>
                ID: ${tourist?.id || 'N/A'}${reason ? `<br><span class="text-danger"><strong>Trigger: ${reason}</strong></span>` : ''}
            `;
        }

        // Cancel countdown
        this.cancelCountdown = 10;
        const timerEl = document.getElementById('sos-cancel-timer');
        if (timerEl) timerEl.textContent = this.cancelCountdown;

        if (this.cancelTimer) clearInterval(this.cancelTimer);

        this.cancelTimer = setInterval(() => {
            this.cancelCountdown--;
            if (timerEl) timerEl.textContent = this.cancelCountdown;

            if (this.cancelCountdown <= 0) {
                clearInterval(this.cancelTimer);
                const cancelBtn = document.getElementById('sos-cancel-btn');
                if (cancelBtn) {
                    cancelBtn.disabled = true;
                    cancelBtn.innerHTML = '<i class="fas fa-check"></i> Alert Confirmed — Help is on the way';
                    cancelBtn.style.opacity = '0.5';
                }
            }
        }, 1000);
    },

    simulateNotifications() {
        const contacts = document.querySelectorAll('.sos-contact');
        const delays = [1500, 2500, 3500, 4500];

        contacts.forEach((contact, i) => {
            setTimeout(() => {
                contact.classList.add('notified');
                const status = contact.querySelector('.sos-contact-status');
                if (status) status.textContent = 'Notified ✓';
            }, delays[i]);
        });
    },

    cancelSOS() {
        if (this.cancelCountdown <= 0) return;

        this.isActive = false;
        clearInterval(this.cancelTimer);

        // Hide modal
        const modal = document.getElementById('sos-modal');
        if (modal) modal.classList.add('hidden');

        // Reset contacts
        document.querySelectorAll('.sos-contact').forEach(c => {
            c.classList.remove('notified');
            const status = c.querySelector('.sos-contact-status');
            if (status) status.textContent = 'Notifying...';
        });

        // Reset cancel button
        const cancelBtn = document.getElementById('sos-cancel-btn');
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = '<i class="fas fa-xmark"></i> Cancel SOS (<span id="sos-cancel-timer">10</span>s)';
            cancelBtn.style.opacity = '1';
        }

        // Update alert status
        const alerts = DB.getAlerts();
        const latest = alerts.filter(a => a.type === 'sos').sort((a, b) => b.timestamp - a.timestamp)[0];
        if (latest) {
            latest.status = 'cancelled';
            DB.saveAlert(latest);
        }

        if (window.Features && typeof Features.updateInsuranceStatus === 'function') {
            Features.updateInsuranceStatus();
        }

        Utils.toast('SOS Cancelled', 'Emergency alert has been cancelled', 'info');
    },

    // ==================== Smart Sensor Simulators ====================
    micStream: null,
    audioContext: null,
    analyzer: null,
    isMonitoringMic: false,

    startMicMonitor() {
        if (this.isMonitoringMic) return;
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.micStream = stream;
                    this.isMonitoringMic = true;
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const source = this.audioContext.createMediaStreamSource(stream);
                    this.analyzer = this.audioContext.createAnalyser();
                    this.analyzer.fftSize = 256;
                    source.connect(this.analyzer);
                    
                    const bufferLength = this.analyzer.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    
                    Utils.toast('Voice Scream Monitor Active', 'Acoustic voice analysis is active.', 'success');
                    
                    const checkVolume = () => {
                        if (!this.isMonitoringMic) return;
                        this.analyzer.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / bufferLength;
                        
                        // Volume spike (> 75) represents a scream / high noise
                        if (average > 75) {
                            Utils.toast('Scream Detected!', 'Loud acoustic scream picked up by AI Sensor. Dispatching SOS!', 'danger', 5000);
                            this.activateSOS('Voice Panic (Scream Sound Spike)');
                            this.stopMicMonitor();
                        } else {
                            requestAnimationFrame(checkVolume);
                        }
                    };
                    checkVolume();
                })
                .catch(err => {
                    console.warn('Microphone permission denied:', err);
                    Utils.toast('Voice Mic Bypassed', 'Webcam/Mic blocked. Dynamic buttons fully operational.', 'warning');
                });
        } else {
            Utils.toast('Audio API Unsupported', 'Scream mic monitor bypassed. Dynamic buttons operational.', 'warning');
        }
    },

    stopMicMonitor() {
        this.isMonitoringMic = false;
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        Utils.toast('Voice Scream Monitor Paused', 'Acoustic sensor deactivated.', 'info');
    },

    triggerVoicePanic(word) {
        Utils.toast('Voice AI Analyzer', `Processing acoustic voice match for: "${word}"`, 'info');
        setTimeout(() => {
            Utils.toast('Voice Trigger Matches!', 'Scream keyword matched securely on blockchain ledger. Initializing SOS!', 'danger');
            this.activateSOS(`Voice Panic Keyword Match ("${word}")`);
        }, 1200);
    },

    triggerShake() {
        Utils.toast('Accelerometer Spike', 'Rapid 3-axis motion detected (Heavy Shaking)!', 'warning');
        setTimeout(() => {
            this.activateSOS('Heavy Phone Shaking Sensor');
        }, 1200);
    },

    triggerFall() {
        Utils.toast('Gyroscope Spike', 'Sudden height vector drop detected (Fall Event)!', 'warning');
        setTimeout(() => {
            this.activateSOS('Smartwatch Gyroscopic Fall Detector');
        }, 1200);
    },

    triggerInactivity() {
        Utils.toast('Zero Inertial Movement', 'Tourist has not moved or interacted for 2 hours!', 'warning');
        setTimeout(() => {
            this.activateSOS('Prolonged Device Inactivity Alert');
        }, 1200);
    }
};
