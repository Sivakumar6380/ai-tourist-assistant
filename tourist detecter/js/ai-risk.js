/* ================================================
   SafeTravel AI — AI Risk Prediction Engine
   ================================================ */

const AIRisk = {
    forceNightMode: false,
    simulatedSprint: false,
    simulatedStop: false,
    simulatedIsolated: false,
    currentScore: 0,

    init() {
        this.gaugeCanvas = document.getElementById('risk-gauge-canvas');
        this.history = [];
        this.drawGauge(this.currentScore);
        
        // Setup Night Mode interval logic
        if (this.evalInterval) clearInterval(this.evalInterval);
        this.evalInterval = setInterval(() => {
            this.evaluate();
        }, this.forceNightMode ? 3000 : 5000); // More frequent checks at night
    },

    evaluate() {
        const pos = GPS.getCurrentCoords();
        if (!pos) return;

        let score = 0;
        const factors = {};

        // Factor 1: Night Safety Mode & Time of Day
        const hour = new Date().getHours();
        const isNight = this.forceNightMode || (hour >= 20 || hour < 6);
        if (isNight) {
            score += 25;
            factors['Night Safety Active 🌙'] = '+25';
        } else if (hour >= 19 || hour < 6) {
            score += 12;
            factors['Time (Evening)'] = '+12';
        } else {
            score += 3;
            factors['Time (Day)'] = '+3';
        }

        // Factor 2: Proximity to danger zone
        const closest = GeoFence.getClosestZone(pos.lat, pos.lng);
        if (closest) {
            if (closest.distance <= closest.radius) {
                const zoneScore = closest.riskLevel === 'high' ? 30 :
                    closest.riskLevel === 'medium' ? 18 : 8;
                score += zoneScore;
                factors['Danger Zone'] = `+${zoneScore}`;
            } else if (closest.distance <= closest.radius * 2) {
                score += 8;
                factors['Near Zone'] = '+8';
            } else {
                factors['Zone Distance'] = '+0';
            }
        }

        // Factor 3: Speed anomaly & Travel Behavior Pattern (Running)
        if (this.simulatedSprint) {
            score += 30;
            factors['Sudden Running 🏃'] = '+30';
        } else if (pos.speed > 20) {
            score += 15;
            factors['High Speed'] = '+15';
        } else if (pos.speed > 10) {
            score += 7;
            factors['Moderate Speed'] = '+7';
        } else if (pos.speed < 0.1 && GPS.positions.length > 10) {
            // Stationary for too long
            score += 10;
            factors['Stationary'] = '+10';
        } else {
            score += 2;
            factors['Normal Speed'] = '+2';
        }

        // Behavior pattern check: Abnormal Stop in dangerous zone
        if (this.simulatedStop) {
            score += 25;
            factors['Abnormal Stop 🛑'] = '+25';
        }

        // Behavior pattern check: Entering Isolated Area
        if (this.simulatedIsolated) {
            score += 25;
            factors['Isolated Area 🪨'] = '+25';
        }

        // Factor 4: Route deviation / Lost Confusion Pattern
        let isLostPattern = false;
        if (GPS.positions.length > 5) {
            const recent = GPS.positions.slice(-5);
            let totalDev = 0;
            for (let i = 1; i < recent.length; i++) {
                const bearing1 = Math.atan2(
                    recent[i].lng - recent[i - 1].lng,
                    recent[i].lat - recent[i - 1].lat
                );
                if (i > 1) {
                    const bearing0 = Math.atan2(
                        recent[i - 1].lng - recent[i - 2].lng,
                        recent[i - 1].lat - recent[i - 2].lat
                    );
                    totalDev += Math.abs(bearing1 - bearing0);
                }
            }
            if (totalDev > 3) {
                score += 15;
                factors['Erratic Path (Lost?)'] = '+15';
                isLostPattern = true;
            } else {
                factors['Route Pattern'] = '+0';
            }
        }

        // Lost Tourist Recovery Trigger
        if (isLostPattern && window.Features && typeof Features.triggerLostRecovery === 'function') {
            Features.triggerLostRecovery();
        }

        // Factor 5: Area crime rate
        if (closest && closest.distance <= closest.radius * 3) {
            const crimeScore = Math.round(closest.crimeRate * 2);
            score += crimeScore;
            factors['Crime Rate'] = `+${crimeScore}`;
        }

        // Factor 6: Weather & Disaster alerts (Feature 17)
        let city = 'Delhi';
        if (pos.lat > 18 && pos.lat < 20) city = 'Mumbai';
        else if (pos.lat > 25 && pos.lat < 27) city = 'Jaipur';
        const weather = DB.getWeatherAlerts().find(w => w.city === city);
        if (weather && weather.severity === 'high') {
            score += 15;
            factors['Weather (High Risk)'] = '+15';
        } else if (weather && weather.severity === 'medium') {
            score += 8;
            factors['Weather (Moderate)'] = '+8';
        }

        // Factor 7: Smart Wearable Anomalies (Feature 15) & Stress Detection
        if (window.FitSync && FitSync.isAbnormal()) {
            score += 22;
            factors['Wearable Pulse Alert'] = '+22';
        }

        // Factor 8: Safe Check-in Overdue (Feature 18)
        if (window.CheckIn && CheckIn.isOverdue()) {
            score += 25;
            factors['Check-in Overdue'] = '+25';
        }

        // Clamp to 0-100
        score = Utils.clamp(Math.round(score), 0, 100);

        // Smooth transition
        this.currentScore = Math.round(this.currentScore * 0.5 + score * 0.5);

        // Store history
        this.history.push({ score: this.currentScore, timestamp: Date.now() });
        if (this.history.length > 100) this.history.shift();

        // Update UI
        this.updateUI(factors);

        // Auto Video Recording Trigger on dangerous threat level (>70)
        if (this.currentScore >= 71) {
            if (window.Features && typeof Features.startAutoVideoRecording === 'function') {
                Features.startAutoVideoRecording();
            }
        }

        // Trigger alert if high risk (Lower threshold to 50 in Night mode)
        const threshold = isNight ? 50 : 65;
        if (this.currentScore > threshold && (!this._lastHighAlert || Date.now() - this._lastHighAlert > 60000)) {
            this._lastHighAlert = Date.now();
            this.triggerHighRiskAlert();
        }
    },

    updateUI(factors) {
        const score = this.currentScore;
        const riskClass = Utils.riskClass(score);
        const riskLabel = Utils.riskLabel(score);
        const riskColor = Utils.riskColor(score);

        // Ambient Danger Glow System (Feature 1)
        const glowEl = document.getElementById('danger-ambient-glow');
        if (glowEl) {
            glowEl.className = `ambient-glow risk-${riskClass}`;
        }

        // Gauge value
        const gaugeVal = document.getElementById('risk-gauge-value');
        const gaugeLabel = document.getElementById('risk-gauge-label');
        if (gaugeVal) {
            gaugeVal.textContent = score;
            gaugeVal.style.color = riskColor;
        }
        if (gaugeLabel) {
            gaugeLabel.textContent = riskLabel + ' RISK';
            gaugeLabel.style.color = riskColor;
        }

        // Top stat card
        const riskText = document.getElementById('risk-level-text');
        const riskBadge = document.getElementById('risk-score-badge');
        const statIcon = document.getElementById('stat-risk');
        if (riskText) {
            riskText.textContent = riskLabel;
            riskText.style.color = riskColor;
        }
        if (riskBadge) {
            riskBadge.textContent = score;
            riskBadge.style.background = riskColor + '22';
            riskBadge.style.color = riskColor;
        }
        if (statIcon) {
            const icon = statIcon.querySelector('.stat-icon');
            if (icon) {
                icon.className = `stat-icon risk-${riskClass}`;
            }
        }

        // Draw gauge
        this.drawGauge(score);

        // Risk factors
        const factorsEl = document.getElementById('risk-factors');
        if (factorsEl && factors) {
            factorsEl.innerHTML = Object.entries(factors).map(([k, v]) => `
                <div class="risk-factor">
                    <span>${k}</span>
                    <span class="risk-factor-val" style="color:${parseInt(v) > 10 ? 'var(--danger)' : parseInt(v) > 5 ? 'var(--warning)' : 'var(--text-dim)'}">${v}</span>
                </div>
            `).join('');
        }

        // Update Safety Score Widget if existing
        if (window.Features && typeof Features.updateSafetyScoreDisplay === 'function') {
            Features.updateSafetyScoreDisplay(score);
        }
    },

    drawGauge(score) {
        const canvas = this.gaugeCanvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h - 10;
        const radius = 80;

        ctx.clearRect(0, 0, w, h);

        // Background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0, false);
        ctx.strokeStyle = '#1a2237';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Score arc
        const angle = Math.PI + (score / 100) * Math.PI;
        const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, '#ff3366');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, angle, false);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, angle, false);
        ctx.strokeStyle = Utils.riskColor(score) + '33';
        ctx.lineWidth = 24;
        ctx.stroke();
    },

    triggerHighRiskAlert() {
        Utils.toast('🚨 HIGH RISK', 'AI has detected elevated risk levels. Stay alert!', 'danger', 8000);

        const pos = GPS.getCurrentCoords();
        const alert = {
            id: 'A' + Utils.uid(),
            touristId: Auth.currentUser?.id,
            type: 'ai_risk',
            riskScore: this.currentScore,
            message: `AI detected high risk score: ${this.currentScore}`,
            lat: pos?.lat || 0,
            lng: pos?.lng || 0,
            status: 'active',
            timestamp: Date.now()
        };

        DB.saveAlert(alert);
        GeoFence.updateAlertsList();
    },

    setNightMode(active) {
        this.forceNightMode = active;
        this.init();
        Utils.toast(active ? 'Night Mode Enabled 🌙' : 'Night Mode Normal', 
            active ? 'Enhanced safety tracking and low alert thresholds.' : 'Standard threshold monitoring active.', 
            active ? 'warning' : 'success');
        this.evaluate();
    }
};
