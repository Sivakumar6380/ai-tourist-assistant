/* ================================================
   SafeTravel AI — Main App Controller & Router
   ================================================ */

const App = {
    currentPage: null,

    async init() {
        // Seed database
        DB.seedData();

        // Init blockchain
        Blockchain.init();

        // Init auth and check session
        const hasSession = Auth.init();

        // Setup blockchain verification
        Blockchain.setupVerification();

        // Hide loading screen
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 600);

            if (hasSession) {
                if (Auth.currentUser.role === 'admin') {
                    this.startAdmin();
                } else {
                    this.startTourist();
                }
            } else {
                this.showPage('login');
            }
        }, 2200);
    },

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('page-enter');
        });

        const page = document.getElementById('page-' + pageId);
        if (page) {
            page.classList.remove('hidden');
            page.classList.add('page-enter');
            this.currentPage = pageId;
        }
    },

    startTourist() {
        const nav = document.getElementById('main-nav');
        nav.classList.remove('hidden');

        // Set nav links
        const navLinks = document.getElementById('nav-links');
        navLinks.innerHTML = `
            <button class="nav-link active" data-page="dashboard"><i class="fas fa-gauge-high"></i> Dashboard</button>
            <button class="nav-link" data-page="protection"><i class="fas fa-shield-cat"></i> Protection Hub</button>
            <button class="nav-link" data-page="blockchain"><i class="fas fa-cubes"></i> Blockchain ID</button>
        `;

        // Nav link clicks
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const page = link.dataset.page;
                this.showPage(page);

                if (page === 'blockchain') {
                    Blockchain.renderFullViewer(Auth.currentUser);
                }
            });
        });

        // Back from blockchain
        document.getElementById('back-from-blockchain').addEventListener('click', () => {
            navLinks.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            navLinks.querySelector('[data-page="dashboard"]').classList.add('active');
            this.showPage('dashboard');
        });

        // View blockchain button
        document.getElementById('view-blockchain-btn').addEventListener('click', () => {
            navLinks.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            navLinks.querySelector('[data-page="blockchain"]').classList.add('active');
            this.showPage('blockchain');
            Blockchain.renderFullViewer(Auth.currentUser);
        });

        // Nav brand click
        document.getElementById('nav-brand').onclick = () => {
            navLinks.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            navLinks.querySelector('[data-page="dashboard"]').classList.add('active');
            this.showPage('dashboard');
        };

        // Show dashboard
        this.showPage('dashboard');

        // Init modules
        setTimeout(() => {
            GPS.initTouristMap();
            AIRisk.init();
            SOS.init();
            Blockchain.renderMiniCard(Auth.currentUser);
            GeoFence.updateAlertsList();

            // Initialize Premium SIH Widgets
            if (window.CheckIn) CheckIn.start();
            if (window.FitSync) FitSync.start();
            if (window.Features) Features.init();

            // Update blockchain status
            const bcStatus = document.getElementById('blockchain-status-text');
            if (bcStatus) {
                const block = Blockchain.getIdentityBlock(Auth.currentUser.id);
                bcStatus.textContent = block ? 'Verified ✓' : 'Pending';
                bcStatus.style.color = block ? 'var(--success)' : 'var(--warning)';
            }
        }, 300);

        Utils.toast('Welcome', `Logged in as ${Auth.currentUser.name}`, 'success');
    },

    startAdmin() {
        const nav = document.getElementById('main-nav');
        nav.classList.remove('hidden');

        // Set admin nav links
        const navLinks = document.getElementById('nav-links');
        navLinks.innerHTML = `
            <button class="nav-link active" data-page="admin"><i class="fas fa-shield-halved"></i> Command Center</button>
        `;

        // Update status
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Admin Mode';
            statusText.style.color = 'var(--purple)';
        }
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) statusDot.style.background = 'var(--purple)';

        // Nav brand
        document.getElementById('nav-brand').onclick = () => this.showPage('admin');

        // Show admin page
        this.showPage('admin');

        // Ensure all tourists have blockchain entries
        DB.getTourists().filter(t => t.role === 'tourist').forEach(t => {
            if (!Blockchain.getIdentityBlock(t.id)) {
                Blockchain.addIdentityBlock(t);
            }
        });

        // Init admin
        setTimeout(() => Admin.init(), 300);

        Utils.toast('Admin Mode', 'Welcome to the Command Center', 'info');
    }
};

// ==================== Premium SIH Safety Controllers ====================

const CheckIn = {
    timer: 120,
    interval: null,
    isOverdueState: false,

    start() {
        if (this.interval) clearInterval(this.interval);
        this.timer = 120;
        this.isOverdueState = false;
        
        const timerVal = document.getElementById('checkin-timer-val');
        const progressFill = document.getElementById('checkin-progress-fill');
        const checkinBtn = document.getElementById('checkin-btn');

        if (checkinBtn) {
            checkinBtn.className = 'btn btn-sm btn-success';
            checkinBtn.innerHTML = '<i class="fas fa-check"></i> Check-In OK';
        }

        this.interval = setInterval(() => {
            this.timer--;
            if (timerVal) timerVal.textContent = this.timer + 's';
            
            const pct = (this.timer / 120) * 100;
            if (progressFill) {
                progressFill.style.width = pct + '%';
                if (pct < 25) {
                    progressFill.style.background = 'var(--danger)';
                } else if (pct < 50) {
                    progressFill.style.background = 'var(--warning)';
                } else {
                    progressFill.style.background = 'var(--success)';
                }
            }

            if (this.timer <= 0) {
                clearInterval(this.interval);
                this.isOverdueState = true;
                if (checkinBtn) {
                    checkinBtn.className = 'btn btn-sm btn-danger';
                    checkinBtn.innerHTML = '<i class="fas fa-triangle-exclamation animate-pulse"></i> OVERDUE!';
                }
                Utils.toast('Check-In Overdue!', 'Warning: Safe countdown elapsed. Threat levels spiked!', 'danger', 7000);
                
                if (window.AIRisk) AIRisk.evaluate();
            }
        }, 1000);
    },

    resetTimer() {
        Utils.toast('Check-In Verified', 'Safe status synced on blockchain ledger.', 'success');
        this.start();
        if (window.AIRisk) AIRisk.evaluate();
    },

    isOverdue() {
        return this.isOverdueState;
    }
};

const FitSync = {
    bpm: 72,
    stress: 'Normal',
    interval: null,
    isAbnormalState: false,

    start() {
        if (this.interval) clearInterval(this.interval);
        this.isAbnormalState = false;

        const bpmEl = document.getElementById('wearable-bpm');
        const stressEl = document.getElementById('wearable-stress');
        const heartIcon = document.getElementById('heart-pulse-icon');
        const spikeBtn = document.getElementById('wearable-spike-btn');

        if (stressEl) {
            stressEl.textContent = 'Normal';
            stressEl.style.color = 'var(--success)';
        }
        if (spikeBtn) {
            spikeBtn.innerHTML = '<i class="fas fa-heart-crack text-danger"></i> Spike Heart Rate';
            spikeBtn.classList.remove('active');
        }

        this.interval = setInterval(() => {
            if (this.isAbnormalState) {
                this.bpm = Utils.randInt(118, 142);
                this.stress = 'CRITICAL';
                if (heartIcon) heartIcon.style.animationDuration = '0.3s';
            } else {
                this.bpm = Utils.randInt(68, 79);
                this.stress = 'Normal';
                if (heartIcon) heartIcon.style.animationDuration = '0.8s';
            }

            if (bpmEl) bpmEl.innerHTML = `${this.bpm} <span style="font-size: 0.7rem; font-weight: normal; color: var(--text-dim);">BPM</span>`;
            if (stressEl) {
                stressEl.textContent = this.stress;
                stressEl.style.color = this.stress === 'CRITICAL' ? 'var(--danger)' : 'var(--success)';
            }
        }, 2000);
    },

    toggleAbnormalPulse() {
        this.isAbnormalState = !this.isAbnormalState;
        const spikeBtn = document.getElementById('wearable-spike-btn');

        if (this.isAbnormalState) {
            Utils.toast('Smartwatch Vital Alert', 'Wearable telemetry reports high psychological stress! Heart Rate > 120bpm. Alerting contacts...', 'danger');
            if (spikeBtn) {
                spikeBtn.innerHTML = '<i class="fas fa-sync"></i> Normalize Vitals';
                spikeBtn.classList.add('active');
            }
        } else {
            Utils.toast('Smartwatch Sync Normal', 'Resting vitals stabilized. Physiological stress normal.', 'success');
            if (spikeBtn) {
                spikeBtn.innerHTML = '<i class="fas fa-heart-crack text-danger"></i> Spike Heart Rate';
                spikeBtn.classList.remove('active');
            }
        }

        if (window.AIRisk) AIRisk.evaluate();
    },

    isAbnormal() {
        return this.isAbnormalState;
    }
};

const Taxi = {
    verifyPlate() {
        const inputEl = document.getElementById('taxi-plate-input');
        if (!inputEl) return;
        const plate = inputEl.value.trim().toUpperCase();
        if (!plate) {
            Utils.toast('Plate Required', 'Enter a valid license plate number', 'warning');
            return;
        }

        const cab = DB.getTaxi(plate);
        if (cab) {
            if (cab.verified) {
                Utils.toast('✓ LICENSED TAXI DETECTED', `Vehicle is safe. Driver: ${cab.driverName}, Company: ${cab.company}. Rating: ${cab.rating}⭐. Status: ${cab.status}.`, 'success', 8000);
            } else {
                Utils.toast('⚠️ FRAUDULENT CAB ALERT!', `Warning: Plate flagged — Driver: ${cab.driverName}, Company: ${cab.company}. ${cab.status}. Avoid boarding!`, 'danger', 10000);
            }
        } else {
            Utils.toast('🛑 UNREGISTERED TAXI DETECTED', `CRITICAL: The plate "${plate}" is NOT registered in the government transport database! Scams, fake drivers, and theft alerts mapped in this zone. Do NOT enter.`, 'danger', 10000);
        }
    }
};

// Inject GPS specific sharing & SMS mock utilities
GPS.isOfflineMode = false;

GPS.toggleOfflineSMSMode = function() {
    this.isOfflineMode = !this.isOfflineMode;
    const btn = document.getElementById('network-status-btn');
    if (this.isOfflineMode) {
        if (btn) {
            btn.textContent = 'OFFLINE';
            btn.className = 'btn btn-xs btn-danger';
        }
        Utils.toast('Connection Offline', 'Offline SMS simulator active! SOS alerts will simulate direct SMS dispatch to contacts and police with coordinates.', 'warning', 6000);
    } else {
        if (btn) {
            btn.textContent = 'ONLINE';
            btn.className = 'btn btn-xs btn-success';
        }
        Utils.toast('Connection Restored', 'Standard secure network synchronization re-established.', 'success');
    }
};

GPS.shareLiveTrackingLink = function() {
    const tourist = Auth.currentUser;
    const pos = this.getCurrentCoords() || { lat: 28.6139, lng: 77.2090 };
    const url = `${window.location.origin}${window.location.pathname}?tracking=${tourist?.id || 'T001'}&lat=${pos.lat.toFixed(5)}&lng=${pos.lng.toFixed(5)}`;
    
    navigator.clipboard.writeText(url).then(() => {
        Utils.toast('Link Copied!', 'Live tracking link copied to clipboard. Share with Police/Family.', 'success');
    }).catch(() => {
        Utils.toast('Tracking Link', `URL: ${url}`, 'info', 8000);
    });
};

// Boot the app
document.addEventListener('DOMContentLoaded', () => App.init());
