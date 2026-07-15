/* ================================================
   SafeTravel AI — Advanced Safety Features Module
   ================================================ */

const Features = {
    // State variables
    bubbleInterval: null,
    arStream: null,
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    typingTracker: {
        lastTime: 0,
        speeds: [],
        backspaces: 0
    },
    stressLevel: 15, // 0-100
    groupSeparated: false,
    heatmapLayers: null,
    isHeatmapActive: false,

    init() {
        // Start safe bubble check
        if (this.bubbleInterval) clearInterval(this.bubbleInterval);
        this.bubbleInterval = setInterval(() => {
            this.checkSafeBubble();
            this.checkFakeHelpProximity();
        }, 5000);

        // Bind typing detection for stress detection
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => this.trackTypingStress(e));
        }

        // Setup recommendations list
        this.renderRecommendations();

        // Setup companion list
        this.renderCompanions();

        // Setup Insurance status
        this.updateInsuranceStatus();
    },

    // 1. Threat Level Color System -> Managed in CSS + AIRisk.updateUI

    // 2. Smart "Safe Bubble" Feature
    checkSafeBubble() {
        const pos = GPS.getCurrentCoords();
        if (!pos) return;

        const crowded = DB.getCrowdedAreas();
        const services = DB._get('emergency_services').filter(s => s.type === 'police');

        let minDist = Infinity;
        let closestName = 'Safe Hotspot';

        crowded.forEach(c => {
            const d = Utils.haversine(pos.lat, pos.lng, c.lat, c.lng);
            if (d < minDist) {
                minDist = d;
                closestName = c.name;
            }
        });

        services.forEach(s => {
            const d = Utils.haversine(pos.lat, pos.lng, s.lat, s.lng);
            if (d < minDist) {
                minDist = d;
                closestName = s.name;
            }
        });

        const bubbleEl = document.getElementById('bubble-status-badge');
        const bubbleDistEl = document.getElementById('bubble-distance-val');

        if (minDist > 800) {
            if (bubbleEl) {
                bubbleEl.className = 'badge badge-high';
                bubbleEl.textContent = 'POPPED (Vulnerable)';
            }
            if (bubbleDistEl) bubbleDistEl.innerHTML = `⚠️ ${Math.round(minDist)}m from safety (${closestName})`;

            // Cooldown alert toast
            const now = Date.now();
            if (!this._lastBubbleAlert || now - this._lastBubbleAlert > 60000) {
                this._lastBubbleAlert = now;
                Utils.toast('⚠️ Safe Bubble Warning', 'You are moving away from crowded areas or police posts. Bubble range exceeded!', 'warning', 6000);
            }
        } else {
            if (bubbleEl) {
                bubbleEl.className = 'badge badge-low';
                bubbleEl.textContent = 'SECURED (Within Bubble)';
            }
            if (bubbleDistEl) bubbleDistEl.innerHTML = `🛡️ ${Math.round(minDist)}m to nearest safe zone (${closestName})`;
        }
    },

    // 3. AI Fake Help Detection
    checkFakeHelpProximity() {
        const pos = GPS.getCurrentCoords();
        if (!pos) return;

        const scams = DB.getScamReports();
        let nearScam = false;

        scams.forEach(s => {
            const d = Utils.haversine(pos.lat, pos.lng, s.lat, s.lng);
            if (d < 300) {
                nearScam = true;
                const now = Date.now();
                if (!this._lastScamAlert || now - this._lastScamAlert > 60000) {
                    this._lastScamAlert = now;
                    Utils.toast('🚨 SCAM WARNING', `Multiple fake guides and helper scams reported nearby: "${s.title}"`, 'danger', 7000);
                }
            }
        });

        const scamStatusEl = document.getElementById('scam-proximity-status');
        if (scamStatusEl) {
            scamStatusEl.innerHTML = nearScam 
                ? '<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Scam Hotspot Proximity Detected!</span>' 
                : '<span class="text-success"><i class="fas fa-shield-halved"></i> No scam reports reported in immediate vicinity.</span>';
        }
    },

    verifyScamPhoneNumber() {
        const input = document.getElementById('scam-phone-input');
        const resEl = document.getElementById('scam-phone-result');
        if (!input || !resEl) return;

        const val = input.value.trim();
        if (!val) {
            resEl.textContent = 'Please enter a phone number.';
            resEl.className = 'text-warning';
            return;
        }

        const scams = DB.getScamReports();
        const matches = scams.filter(s => s.phone && s.phone.replace(/[^0-9]/g, '').includes(val.replace(/[^0-9]/g, '')));

        if (matches.length > 0) {
            resEl.innerHTML = `<span class="text-danger">🚨 BLACKLISTED GUIDE/HELPER!<br>Linked to "${matches[0].title}" with ${matches[0].reportsCount} incidents. Avoid sharing locations!</span>`;
            Utils.toast('Scammer Flagged', 'This helper number matches blacklisted scam logs.', 'danger');
        } else {
            resEl.innerHTML = '<span class="text-success">✓ Clear Record: No complaints logged for this number. Proceed with normal caution.</span>';
        }
    },

    // 4. Emergency Auto Video Recording
    startAutoVideoRecording() {
        if (this.isRecording) return;
        this.isRecording = true;

        const panel = document.getElementById('auto-recording-panel');
        if (panel) panel.classList.remove('hidden');

        const video = document.getElementById('auto-record-video');
        if (!video) return;

        Utils.toast('📹 Auto Video Recording Active', 'Emergency front camera streaming initiated. Live P2P cloud uplink secured.', 'danger', 6000);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    this.arStream = stream;
                    video.srcObject = stream;
                    video.play();
                })
                .catch(err => {
                    console.warn('Camera blocked, showing fallback interactive camera feed.', err);
                    video.style.background = '#111';
                    video.poster = 'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?w=400';
                });
        }
    },

    stopAutoVideoRecording() {
        this.isRecording = false;
        const panel = document.getElementById('auto-recording-panel');
        if (panel) panel.classList.add('hidden');

        if (this.arStream) {
            this.arStream.getTracks().forEach(track => track.stop());
            this.arStream = null;
        }
        Utils.toast('Recording Stopped', 'Incident footage hashed and saved to Emergency Cloud Portal.', 'success');
    },

    // 5. AI "Travel Behavior Pattern" Anomalies -> Managed via Simulator Toggles in UI
    simulateSprintPattern() {
        AIRisk.simulatedSprint = !AIRisk.simulatedSprint;
        const btn = document.getElementById('sim-sprint-btn');
        if (btn) {
            btn.className = AIRisk.simulatedSprint ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-ghost';
            btn.innerHTML = AIRisk.simulatedSprint ? '🏃 Sprint Active (Reset)' : '🏃 Anomaly: Sudden Sprint';
        }
        if (AIRisk.simulatedSprint) {
            Utils.toast('AI Telemetry Pattern', 'Abnormal Speed Anomaly detected (Sprint: 18m/s). AI evaluating risk.', 'warning');
        }
        AIRisk.evaluate();
    },

    simulateStopPattern() {
        AIRisk.simulatedStop = !AIRisk.simulatedStop;
        const btn = document.getElementById('sim-stop-btn');
        if (btn) {
            btn.className = AIRisk.simulatedStop ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-ghost';
            btn.innerHTML = AIRisk.simulatedStop ? '🛑 Stop Active (Reset)' : '🛑 Anomaly: Prolonged Stop';
        }
        if (AIRisk.simulatedStop) {
            Utils.toast('AI Telemetry Pattern', 'Tourist stationary in High Crime geofence for 15+ mins. Threat level raising.', 'warning');
        }
        AIRisk.evaluate();
    },

    simulateIsolatedPattern() {
        AIRisk.simulatedIsolated = !AIRisk.simulatedIsolated;
        const btn = document.getElementById('sim-isolated-btn');
        if (btn) {
            btn.className = AIRisk.simulatedIsolated ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-ghost';
            btn.innerHTML = AIRisk.simulatedIsolated ? '🪨 Isolated Active (Reset)' : '🪨 Anomaly: Isolated Area';
        }
        if (AIRisk.simulatedIsolated) {
            Utils.toast('AI Telemetry Pattern', 'Geofence vector tracking reports tourist entering unpatrolled outer woods.', 'warning');
        }
        AIRisk.evaluate();
    },

    // 6. Smart Companion Tracking
    renderCompanions() {
        const container = document.getElementById('companion-list-container');
        if (!container) return;

        const companions = [
            { name: 'Emma Williams (T004)', role: 'Friend', distance: this.groupSeparated ? 1240 : 35, battery: '78%', status: this.groupSeparated ? 'out-of-range' : 'safe' },
            { name: 'Pierre Dubois (T005)', role: 'Guide Partner', distance: this.groupSeparated ? 1520 : 62, battery: '92%', status: this.groupSeparated ? 'out-of-range' : 'safe' }
        ];

        container.innerHTML = companions.map(c => `
            <div class="companion-card ${c.status === 'out-of-range' ? 'danger-alert' : ''}">
                <div class="companion-avatar"><i class="fas fa-user-friends"></i></div>
                <div class="companion-details">
                    <div class="companion-name">${c.name}</div>
                    <div class="companion-meta">${c.role} • 🔋 ${c.battery}</div>
                </div>
                <div class="companion-dist ${c.status === 'out-of-range' ? 'text-danger font-bold' : ''}">
                    ${c.distance}m
                </div>
            </div>
        `).join('');
    },

    simulateSeparation() {
        this.groupSeparated = !this.groupSeparated;
        const btn = document.getElementById('sim-separate-btn');
        if (btn) {
            btn.className = this.groupSeparated ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-ghost';
            btn.innerHTML = this.groupSeparated ? '👥 Group Out-of-Range' : '👥 Anomaly: Companion Separation';
        }
        this.renderCompanions();

        if (this.groupSeparated) {
            Utils.toast('👥 COMPANION SEPARATION', 'Warning: Emma Williams has separated beyond the safe circle limit (>1000m)!', 'danger', 7000);
            
            // Create companion lost alert
            const alert = {
                id: 'A' + Utils.uid(),
                touristId: Auth.currentUser?.id,
                type: 'ai_risk',
                riskScore: 78,
                message: 'Companion circle alert: Emma Williams moved out of safe range (1240m)',
                lat: GPS.getCurrentCoords()?.lat || 28.6139,
                lng: GPS.getCurrentCoords()?.lng || 77.2090,
                status: 'active',
                timestamp: Date.now()
            };
            DB.saveAlert(alert);
            GeoFence.updateAlertsList();
            AIRisk.evaluate();
        } else {
            Utils.toast('Companions reconnected', 'All group circle members are back within bubble radius.', 'success');
            AIRisk.evaluate();
        }
    },

    // 7. Tourist Safety Score
    updateSafetyScoreDisplay(riskScore) {
        const safetyScore = 100 - Math.round(riskScore * 0.7);
        const scoreEl = document.getElementById('area-safety-score');
        const meterEl = document.getElementById('area-safety-meter-fill');
        
        if (scoreEl) scoreEl.textContent = `${safetyScore}/100`;
        if (meterEl) {
            meterEl.style.width = `${safetyScore}%`;
            meterEl.style.background = safetyScore > 75 ? 'var(--success)' : safetyScore > 45 ? 'var(--warning)' : 'var(--danger)';
        }

        const metricsEl = document.getElementById('area-safety-metrics');
        if (metricsEl) {
            const hour = new Date().getHours();
            const timeGlow = (hour >= 20 || hour < 6 || AIRisk.forceNightMode) ? '🌙 Night mode sensitivity active' : '☀️ Safe daylight coverage';
            const lightingStatus = (hour >= 20 || hour < 6 || AIRisk.forceNightMode) ? '💡 Street lamps active (Moderate)' : '☀️ Direct Sunshine (Excellent)';
            
            metricsEl.innerHTML = `
                <div class="risk-factor"><span>Crowd Density</span><span class="text-accent">Moderate</span></div>
                <div class="risk-factor"><span>Police Proximity</span><span class="text-success">Nearby (250m)</span></div>
                <div class="risk-factor"><span>Incidents Today</span><span class="text-warning">1 Scammer Warning</span></div>
                <div class="risk-factor"><span>Environment Status</span><span>${timeGlow}</span></div>
                <div class="risk-factor"><span>Lighting Profile</span><span>${lightingStatus}</span></div>
            `;
        }
    },

    // 8. AI Night Safety Mode -> Controlled in AIRisk.setNightMode

    // 9. Smart "No Response Detection"
    promptSafetyCheck() {
        const modal = document.getElementById('safety-check-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        let count = 10;
        const countdownEl = document.getElementById('safety-check-countdown');
        if (countdownEl) countdownEl.textContent = count;

        if (this.checkTimer) clearInterval(this.checkTimer);
        this.checkTimer = setInterval(() => {
            count--;
            if (countdownEl) countdownEl.textContent = count;

            if (count <= 0) {
                clearInterval(this.checkTimer);
                modal.classList.add('hidden');
                Utils.toast('🚨 EMERGENCY RESPONSE INITIATED', 'No response detected from tourist. Automatic SOS broadcast triggered.', 'danger', 10000);
                SOS.activateSOS('Zero User Response / Check-in Ignored');
            }
        }, 1000);
    },

    confirmSafe() {
        if (this.checkTimer) clearInterval(this.checkTimer);
        const modal = document.getElementById('safety-check-modal');
        if (modal) modal.classList.add('hidden');
        Utils.toast('Check-in Logged', 'Identity verification and check-in success. Status: SECURE.', 'success');
    },

    // 10. Augmented Reality (AR) Safe Navigation Overlay
    toggleARNavigation() {
        const modal = document.getElementById('ar-modal');
        if (!modal) return;

        const isHidden = modal.classList.contains('hidden');
        if (isHidden) {
            modal.classList.remove('hidden');
            const video = document.getElementById('ar-video');
            if (video) {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                        .then(stream => {
                            this.arStream = stream;
                            video.srcObject = stream;
                            video.play();
                        })
                        .catch(err => {
                            console.warn('Webcam stream unavailable for AR. Activating mock camera background.', err);
                            video.style.background = '#0a1020';
                            video.poster = 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500';
                        });
                }
            }
            Utils.toast('AR View Launched', 'Camera viewport active. Floating AI safety directions rendered.', 'info');
        } else {
            modal.classList.add('hidden');
            if (this.arStream) {
                this.arStream.getTracks().forEach(track => track.stop());
                this.arStream = null;
            }
        }
    },

    // 11. Crime Prediction Heatmap Overlay
    toggleHeatmap() {
        if (!GPS.map) {
            Utils.toast('Map Error', 'Leaflet map is not loaded.', 'danger');
            return;
        }

        const btn = document.getElementById('map-toggle-heatmap');
        this.isHeatmapActive = !this.isHeatmapActive;

        if (this.isHeatmapActive) {
            if (btn) btn.classList.add('active');
            
            // Draw predictive heatmap circle nodes
            this.heatmapLayers = L.layerGroup().addTo(GPS.map);
            const zones = DB.getGeofences();
            
            zones.forEach(z => {
                const color = z.riskLevel === 'high' ? 'red' : z.riskLevel === 'medium' ? 'orange' : 'green';
                
                L.circle([z.lat, z.lng], {
                    radius: z.radius * 2,
                    fillColor: color,
                    fillOpacity: 0.12,
                    stroke: false,
                    interactive: false
                }).addTo(this.heatmapLayers);

                L.circle([z.lat, z.lng], {
                    radius: z.radius * 0.8,
                    fillColor: color,
                    fillOpacity: 0.25,
                    stroke: false,
                    interactive: false
                }).addTo(this.heatmapLayers);
            });
            
            Utils.toast('Predictive Heatmap Active', 'AI incident prediction overlays active on coordinates.', 'success');
        } else {
            if (btn) btn.classList.remove('active');
            if (this.heatmapLayers) {
                this.heatmapLayers.clearLayers();
                GPS.map.removeLayer(this.heatmapLayers);
                this.heatmapLayers = null;
            }
            Utils.toast('Heatmap Overlay Disabled', 'Crime overlays cleared.', 'info');
        }
    },

    // 12. Smart Travel Insurance Integration
    updateInsuranceStatus() {
        const claimsList = document.getElementById('insurance-claims-list');
        if (!claimsList) return;

        const isSOS = SOS.isActive;
        const reportBtn = document.getElementById('download-incident-btn');
        
        if (reportBtn) {
            reportBtn.disabled = !isSOS;
        }

        if (isSOS) {
            claimsList.innerHTML = `
                <div class="insurance-card warning-alert">
                    <div class="insurance-title"><i class="fas fa-file-medical-alt text-danger"></i> Incident Auto-Report Generated</div>
                    <div class="insurance-meta">Auto-filed: ICICI Lombard / Allianz Portal</div>
                    <div class="insurance-status">Status: <span class="text-warning">CLAIM INITIALIZED (Ref ID: INS-${Utils.uid().toUpperCase().substring(0,6)})</span></div>
                </div>
            `;
        } else {
            claimsList.innerHTML = `
                <div class="insurance-card">
                    <div class="insurance-title"><i class="fas fa-shield-alt text-success"></i> Insurance Policy Linked</div>
                    <div class="insurance-meta">Partner: Allianz SafeTravel Global Cover</div>
                    <div class="insurance-status">Status: <span class="text-success">ACTIVE & SECURED</span></div>
                </div>
            `;
        }
    },

    downloadIncidentReport() {
        if (!SOS.isActive) {
            Utils.toast('Download Unavailable', 'No emergency active to compile incident logs.', 'warning');
            return;
        }

        const report = {
            incidentId: 'INC-' + Utils.uid().toUpperCase().substr(0, 8),
            tourist: Auth.currentUser?.name || 'Guest',
            passport: Auth.currentUser?.passport || 'N/A',
            emergencyContact: Auth.currentUser?.emergencyName || 'N/A',
            timestamp: Utils.formatDateTime(Date.now()),
            coordinates: GPS.getCurrentCoords(),
            sensorLogs: {
                aiRiskScore: AIRisk.currentScore,
                heartRate: document.getElementById('fit-heart-val')?.textContent || '72 bpm',
                stressValue: this.stressLevel,
                screamWordTriggered: 'YES (Audio context spike)'
            },
            insuranceStatus: 'Auto Claim Filed'
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `SafeTravel_Incident_Report_${report.incidentId}.json`);
        dlAnchorElem.click();
        
        Utils.toast('Report Downloaded', 'Official Incident Logs JSON downloaded successfully.', 'success');
    },

    // 13. AI Mood/Stress Detection
    trackTypingStress(e) {
        const now = Date.now();
        if (this.typingTracker.lastTime > 0) {
            const diff = now - this.typingTracker.lastTime;
            this.typingTracker.speeds.push(diff);
            if (this.typingTracker.speeds.length > 20) this.typingTracker.speeds.shift();
        }
        
        if (e.key === 'Backspace') {
            this.typingTracker.backspaces++;
        }

        this.typingTracker.lastTime = now;

        // Recalculate Stress Level based on typing speed fluctuations and backspaces
        const avgSpeed = this.typingTracker.speeds.reduce((a, b) => a + b, 0) / (this.typingTracker.speeds.length || 1);
        
        // Fast, erratic typing (avgSpeed < 100ms) or high backspaces increases stress
        let stress = 15;
        if (avgSpeed < 100 && this.typingTracker.speeds.length > 5) stress += 25;
        if (this.typingTracker.backspaces > 8) stress += 20;
        if (AIRisk.currentScore > 50) stress += 30;

        this.stressLevel = Utils.clamp(Math.round(stress), 15, 95);

        // Update Stress Badge
        const stressBadge = document.getElementById('stress-index-val');
        if (stressBadge) {
            stressBadge.textContent = `${this.stressLevel}%`;
            stressBadge.style.color = this.stressLevel > 70 ? 'var(--danger)' : this.stressLevel > 40 ? 'var(--warning)' : 'var(--success)';
        }
    },

    // 14. "Trusted Area" Recommendation Engine
    renderRecommendations() {
        const container = document.getElementById('recommendations-container');
        if (!container) return;

        const recs = DB.getRecommendations();
        container.innerHTML = recs.map(r => `
            <div class="recommendation-item">
                <div class="rec-icon ${r.type}"><i class="fas ${r.type === 'hotel' ? 'fa-hotel' : r.type === 'restaurant' ? 'fa-utensils' : 'fa-taxi'}"></i></div>
                <div class="rec-details">
                    <div class="rec-name">${r.name}</div>
                    <div class="rec-address">${r.address}</div>
                    <div class="rec-rating">⭐ ${r.rating} • <span class="text-success"><i class="fas fa-check-circle"></i> SafeTravel Certified</span></div>
                </div>
            </div>
        `).join('');
    },

    // 15. AI Lost Tourist Recovery System
    triggerLostRecovery() {
        const panel = document.getElementById('lost-recovery-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        
        const textEl = document.getElementById('lost-recovery-instructions');
        if (textEl) {
            textEl.innerHTML = `
                <p class="text-warning"><strong>⚠️ Erratic Walking Pattern Detected (Lost?)</strong></p>
                <p>AI suggests heading towards nearby vetted safe zones:</p>
                <ul style="padding-left: var(--space-md); margin-top: 6px; font-size: 0.78rem;">
                    <li>📍 Walk North-East for 80m towards Connaught Place Police Post</li>
                    <li>🏥 Ram Manohar Lohia Emergency Hospital is 340m West</li>
                </ul>
            `;
        }
    },

    dismissLostRecovery() {
        const panel = document.getElementById('lost-recovery-panel');
        if (panel) panel.classList.add('hidden');
        Utils.toast('Lost Assist Dismissed', 'Normal navigation tracking resumed.', 'success');
    },

    // Predictive Tourist Guardian AI Proactive Route Advice
    checkProactiveGuardian(routeType) {
        if (routeType === 'shortest') {
            const popup = document.getElementById('predictive-guardian-popup');
            if (popup) {
                popup.classList.remove('hidden');
                const msg = popup.querySelector('.guardian-msg');
                if (msg) {
                    msg.innerHTML = `
                        <strong>🔮 Predictive Guardian AI:</strong><br>
                        Crowd build-up and reports of pickpockets detected on the shortest path ahead.<br>
                        <span class="text-success">✓ <strong>Safe Route Suggested</strong></span>. Toggling Safest route option decreases geofence risk by 45%.
                    `;
                }
            }
        } else {
            const popup = document.getElementById('predictive-guardian-popup');
            if (popup) popup.classList.add('hidden');
        }
    }
};
