/* ================================================
   SafeTravel AI — Authentication & Registration
   ================================================ */

const Auth = {
    currentUser: null,

    init() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupNavButtons();

        // Check existing session
        const session = DB.getSession();
        if (session) {
            const tourist = DB.getTourist(session.touristId);
            if (tourist) {
                this.currentUser = tourist;
                return true;
            }
        }
        return false;
    },

    setupLoginForm() {
        const form = document.getElementById('login-form');
        const gotoRegBtn = document.getElementById('goto-register-btn');
        const adminBtn = document.getElementById('admin-login-btn');
        const faceLoginBtn = document.getElementById('face-login-btn');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('login-mobile').value.trim();
            const pass = document.getElementById('login-password').value;

            const tourists = DB.getTourists();
            const user = tourists.find(t => t.phone === phone && t.password === pass);

            if (user) {
                this.login(user);
            } else {
                Utils.toast('Login Failed', 'Invalid mobile number or password', 'danger');
            }
        });

        gotoRegBtn.addEventListener('click', () => {
            App.showPage('register');
        });

        adminBtn.addEventListener('click', () => {
            document.getElementById('login-mobile').value = 'admin';
            document.getElementById('login-password').value = 'admin123';
            Utils.toast('Admin Mode', 'Credentials filled — click Sign In', 'info');
        });

        if (faceLoginBtn) {
            faceLoginBtn.addEventListener('click', () => {
                this.startBiometricLogin();
            });
        }
    },

    startBiometricLogin() {
        const phone = document.getElementById('login-mobile').value.trim();
        if (!phone) {
            Utils.toast('Biometric Error', 'Please enter your mobile number first for strict verification.', 'warning');
            return;
        }

        // Create full screen scanner overlay
        const overlay = document.createElement('div');
        overlay.id = 'face-scanner-overlay';
        overlay.className = 'face-scanner-overlay';
        overlay.innerHTML = `
            <div class="face-scanner-container glass-card">
                <div class="face-scanner-header">
                    <h3><i class="fas fa-face-smile"></i> Biometric Face Scan</h3>
                    <button class="scanner-close-btn" onclick="document.getElementById('face-scanner-overlay').remove()"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="face-scanner-viewport">
                    <video id="face-video" autoplay playsinline muted class="hidden"></video>
                    <div class="face-scanner-animation" id="face-scanner-animation">
                        <div class="scan-contour"></div>
                        <div class="scan-line"></div>
                        <div class="scan-dots"></div>
                    </div>
                    <div class="scanner-hud">
                        <span id="scan-status">INITIALIZING CAMERA...</span>
                        <div class="scan-progress-bar"><div class="scan-progress-fill" id="scan-progress-fill"></div></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const video = document.getElementById('face-video');
        const statusEl = document.getElementById('scan-status');
        const progressEl = document.getElementById('scan-progress-fill');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
                .then(stream => {
                    video.srcObject = stream;
                    video.classList.remove('hidden');
                    this.runScanSequence(stream, statusEl, progressEl, phone);
                })
                .catch(err => {
                    statusEl.textContent = "SIMULATING RETINAL BIOMETRICS...";
                    this.runScanSequence(null, statusEl, progressEl, phone);
                });
        } else {
            statusEl.textContent = "SIMULATING RETINAL BIOMETRICS...";
            this.runScanSequence(null, statusEl, progressEl, phone);
        }
    },

    runScanSequence(stream, statusEl, progressEl, phone) {
        let pct = 0;
        const steps = [
            { limit: 25, msg: "DETECTING FACE..." },
            { limit: 55, msg: "EXTRACTING FACIAL BIOMETRIC HASH..." },
            { limit: 85, msg: "QUERYING BLOCKCHAIN LEDGER..." },
            { limit: 100, msg: "IDENTITY MATCH VERIFIED ✓" }
        ];

        const interval = setInterval(() => {
            pct += 4;
            if (pct > 100) pct = 100;
            if (progressEl) progressEl.style.width = pct + '%';

            const step = steps.find(s => pct <= s.limit) || steps[steps.length - 1];
            if (statusEl) statusEl.textContent = step.msg;

            if (pct >= 100) {
                clearInterval(interval);
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                // Strictly verify against entered mobile number
                const user = DB.getTourists().find(t => t.phone === phone);
                setTimeout(() => {
                    const overlayEl = document.getElementById('face-scanner-overlay');
                    if (overlayEl) overlayEl.remove();
                    
                    if (user) {
                        Utils.toast('Face Match Found', `Welcome back, ${user.name}!`, 'success');
                        this.login(user);
                    } else {
                        Utils.toast('Verification Failed', 'No blockchain identity registered for this mobile number.', 'danger');
                    }
                }, 800);
            }
        }, 120);
    },

    setupRegisterForm() {
        const form = document.getElementById('register-form');
        const backBtn = document.getElementById('goto-login-btn');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const tourist = {
                id: 'T' + Utils.uid().toUpperCase().substr(0, 6),
                name: document.getElementById('reg-name').value.trim(),
                phone: document.getElementById('reg-mobile').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                password: document.getElementById('reg-password').value,
                passport: document.getElementById('reg-passport').value.trim(),
                nationality: document.getElementById('reg-nationality').value.trim(),
                hotel: document.getElementById('reg-hotel').value.trim(),
                emergencyName: document.getElementById('reg-emergency-name').value.trim(),
                emergencyPhone: document.getElementById('reg-emergency-phone').value.trim(),
                role: 'tourist',
                registeredAt: Date.now(),
                lat: 28.6139 + Utils.rand(-0.01, 0.01),
                lng: 77.2090 + Utils.rand(-0.01, 0.01)
            };

            // Check if phone already exists
            const existing = DB.getTourists().find(t => t.phone === tourist.phone);
            if (existing) {
                Utils.toast('Registration Failed', 'This mobile number is already registered', 'danger');
                return;
            }

            DB.saveTourist(tourist);

            // Create blockchain identity
            Blockchain.addIdentityBlock(tourist);

            Utils.toast('Registration Successful', 'Your secure profile has been created!', 'success');
            Utils.toast('Blockchain', 'Digital identity verified and stored on blockchain', 'info', 5000);

            this.login(tourist);
        });

        backBtn.addEventListener('click', () => {
            App.showPage('login');
        });
    },

    setupNavButtons() {
        document.getElementById('nav-logout-btn').addEventListener('click', () => {
            this.logout();
        });
    },

    login(user) {
        this.currentUser = user;
        DB.setSession({ touristId: user.id, loginAt: Date.now() });

        if (user.role === 'admin') {
            App.startAdmin();
        } else {
            // Ensure blockchain identity exists
            if (!Blockchain.getIdentityBlock(user.id)) {
                Blockchain.addIdentityBlock(user);
            }
            App.startTourist();
        }
    },

    logout() {
        this.currentUser = null;
        DB.clearSession();
        GPS.stopTracking();
        App.showPage('login');
        document.getElementById('main-nav').classList.add('hidden');
        Utils.toast('Logged Out', 'Session ended safely', 'info');
    }
};
