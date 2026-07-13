/* ================================================
   SafeTravel AI — Admin Dashboard
   ================================================ */

const Admin = {
    map: null,
    markers: {},
    geofenceLayer: null,
    charts: {},
    simInterval: null,
    refreshInterval: null,

    init() {
        this.initMap();
        this.initCharts();
        this.updateStats();
        this.renderIncidentTable();
        this.renderTouristList();
        this.setupEventListeners();
        this.startSimulation();

        // Refresh every 5s
        this.refreshInterval = setInterval(() => {
            this.updateStats();
            this.renderIncidentTable();
            this.updateCharts();
        }, 5000);
    },

    initMap() {
        this.map = GPS.initMap('admin-map', [24.0, 78.0], 5);
        if (!this.map) return;

        this.geofenceLayer = L.layerGroup().addTo(this.map);
        GPS.drawGeofences(this.map, this.geofenceLayer);

        // Heatmap layer
        this.heatmapLayer = L.layerGroup();
        this.isHeatmapActive = false;

        // Place tourist markers
        const tourists = DB.getTourists().filter(t => t.role === 'tourist');
        tourists.forEach(t => {
            if (!t.lat || !t.lng) return;
            const riskScore = this.getTouristRisk(t.id);
            const color = Utils.riskColor(riskScore);

            const icon = L.divIcon({
                html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${color}88"></div>`,
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const marker = L.marker([t.lat, t.lng], { icon }).addTo(this.map);
            marker.bindPopup(`
                <div style="color:#111;font-family:Inter,sans-serif;min-width:150px">
                    <strong>${t.name}</strong><br>
                    ID: ${t.id}<br>
                    Risk: <span style="color:${color};font-weight:700">${riskScore}</span><br>
                    Phone: ${t.phone}
                </div>
            `);
            this.markers[t.id] = { marker, tourist: t };
        });

        // Toggle zones
        const toggleZonesBtn = document.getElementById('admin-toggle-zones');
        if (toggleZonesBtn) {
            toggleZonesBtn.onclick = () => {
                if (this.map.hasLayer(this.geofenceLayer)) {
                    this.geofenceLayer.clearLayers();
                    this.map.removeLayer(this.geofenceLayer);
                } else {
                    this.geofenceLayer.addTo(this.map);
                    GPS.drawGeofences(this.map, this.geofenceLayer);
                }
            };
        }

        // Toggle heatmap overlay (Feature 20)
        const toggleHeatBtn = document.getElementById('admin-toggle-heatmap');
        if (toggleHeatBtn) {
            toggleHeatBtn.onclick = () => {
                this.isHeatmapActive = !this.isHeatmapActive;
                if (this.isHeatmapActive) {
                    toggleHeatBtn.classList.add('active');
                    this.heatmapLayer.addTo(this.map);
                    this.renderHeatmap();
                } else {
                    toggleHeatBtn.classList.remove('active');
                    this.heatmapLayer.clearLayers();
                    this.map.removeLayer(this.heatmapLayer);
                    Utils.toast('Heatmap Disabled', 'Crime density overlay removed.', 'info');
                }
            };
        }

        // Interactive Custom Danger Zone Builder (Feature 10 / 11)
        let isAddZoneMode = false;
        const addZoneBtn = document.getElementById('admin-add-zone-btn');
        if (addZoneBtn) {
            addZoneBtn.onclick = () => {
                isAddZoneMode = !isAddZoneMode;
                if (isAddZoneMode) {
                    addZoneBtn.classList.add('active');
                    addZoneBtn.innerHTML = '<i class="fas fa-hand-pointer animate-pulse"></i> Click Map...';
                    Utils.toast('Zone Builder Enabled', 'Click anywhere on the Admin Map to draw a new Geo-Fence zone.', 'info');
                } else {
                    addZoneBtn.classList.remove('active');
                    addZoneBtn.innerHTML = '<i class="fas fa-circle-plus"></i> Add Danger Zone';
                }
            };
        }

        this.map.on('click', (e) => {
            if (!isAddZoneMode) return;
            isAddZoneMode = false;
            if (addZoneBtn) {
                addZoneBtn.classList.remove('active');
                addZoneBtn.innerHTML = '<i class="fas fa-circle-plus"></i> Add Danger Zone';
            }

            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            const name = prompt("Enter Dynamic Geo-Fence Zone Name:", "Custom Alert Zone");
            if (!name) return;
            const radiusInput = prompt("Enter Radius in meters:", "600");
            const radius = parseInt(radiusInput) || 600;
            const level = prompt("Enter Threat Level (low / medium / high):", "high").toLowerCase();
            const crimeRate = parseFloat(prompt("Enter Area Crime Coefficient (1.0 to 10.0):", "7.8")) || 6.0;

            const newZone = {
                id: 'GF' + Utils.uid().toUpperCase().substring(0, 4),
                name: name,
                lat: lat,
                lng: lng,
                radius: radius,
                riskLevel: level,
                crimeRate: crimeRate,
                type: "Custom Admin Geofence"
            };

            const zones = DB.getGeofences();
            zones.push(newZone);
            DB.saveGeofences(zones);

            // Re-render immediately
            GPS.drawGeofences(this.map, this.geofenceLayer);
            if (this.isHeatmapActive) this.renderHeatmap();
            
            Utils.toast('Zone Builder', `Successfully mined circular fence "${name}" on local blockchain storage.`, 'success');
        });
    },

    renderHeatmap() {
        if (!this.map) return;
        this.heatmapLayer.clearLayers();

        const zones = DB.getGeofences();
        zones.forEach(z => {
            const color = z.riskLevel === 'high' ? '#ff3366' :
                          z.riskLevel === 'medium' ? '#ffaa00' : '#00ff88';

            // Triple overlapping translucent circles representing gradient heat density!
            L.circle([z.lat, z.lng], {
                radius: z.radius * 2.5,
                fillColor: color,
                fillOpacity: 0.08,
                stroke: false,
                interactive: false
            }).addTo(this.heatmapLayer);

            L.circle([z.lat, z.lng], {
                radius: z.radius * 1.5,
                fillColor: color,
                fillOpacity: 0.16,
                stroke: false,
                interactive: false
            }).addTo(this.heatmapLayer);

            L.circle([z.lat, z.lng], {
                radius: z.radius * 0.7,
                fillColor: color,
                fillOpacity: 0.35,
                stroke: false,
                interactive: false
            }).addTo(this.heatmapLayer);
        });

        Utils.toast('Crime Heatmap Active', 'Glowing crime density gradients rendered.', 'info');
    },

    getTouristRisk(touristId) {
        const alerts = DB.getAlerts().filter(a => a.touristId === touristId && a.status === 'active');
        if (alerts.length === 0) return Utils.randInt(5, 25);
        return Math.max(...alerts.map(a => a.riskScore));
    },

    initCharts() {
        // Risk Distribution Pie
        const alerts = DB.getAlerts();
        const low = alerts.filter(a => a.riskScore <= 30).length;
        const med = alerts.filter(a => a.riskScore > 30 && a.riskScore <= 65).length;
        const high = alerts.filter(a => a.riskScore > 65).length;

        const ctx1 = document.getElementById('chart-risk-dist');
        if (ctx1) {
            this.charts.riskDist = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                    datasets: [{
                        data: [Math.max(low, 3), Math.max(med, 2), Math.max(high, 2)],
                        backgroundColor: ['#00ff8844', '#ffaa0044', '#ff336644'],
                        borderColor: ['#00ff88', '#ffaa00', '#ff3366'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#8892a8', font: { family: 'Inter', size: 11 }, padding: 12 }
                        },
                        title: {
                            display: true,
                            text: 'Risk Distribution',
                            color: '#e8ecf4',
                            font: { family: 'Inter', size: 13, weight: 600 }
                        }
                    }
                }
            });
        }

        // Alerts Over Time
        const ctx2 = document.getElementById('chart-alerts-time');
        if (ctx2) {
            const last7 = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(Date.now() - i * 86400000);
                last7.push({
                    label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                    count: Utils.randInt(1, 8)
                });
            }

            this.charts.alertsTime = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: last7.map(d => d.label),
                    datasets: [{
                        label: 'Alerts',
                        data: last7.map(d => d.count),
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0,212,255,0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#00d4ff',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: '#8892a8', font: { family: 'Inter', size: 10 } }, grid: { color: '#1a223722' } },
                        y: { ticks: { color: '#8892a8', font: { family: 'Inter', size: 10 } }, grid: { color: '#1a223744' }, beginAtZero: true }
                    },
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Alerts (Last 7 Days)',
                            color: '#e8ecf4',
                            font: { family: 'Inter', size: 13, weight: 600 }
                        }
                    }
                }
            });
        }
    },

    updateCharts() {
        // Could update chart data here if needed
    },

    playEmergencySiren() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();
            
            // Beep 1
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            osc1.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35); // down to A4
            gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.35);

            // Beep 2
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);
                gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.35);
            }, 450);
        } catch (e) {
            console.error('[Admin] Web Audio siren failed', e);
        }
    },

    lastActiveSosIds: null,

    updateStats() {
        const tourists = DB.getTourists().filter(t => t.role === 'tourist');
        const alerts = DB.getAlerts();
        const active = alerts.filter(a => a.status === 'active');
        const today = alerts.filter(a => {
            const d = new Date(a.timestamp);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        });

        const avgRisk = active.length > 0
            ? Math.round(active.reduce((s, a) => s + a.riskScore, 0) / active.length)
            : 0;

        const el = (id, val) => {
            const e = document.getElementById(id);
            if (e) e.textContent = val;
        };

        el('admin-total-tourists', tourists.length);
        el('admin-active-alerts', active.length);
        el('admin-avg-risk', avgRisk);
        el('admin-incidents-today', today.length);

        // Check for brand new active SOS alerts
        const activeSos = active.filter(a => a.type === 'sos');
        if (this.lastActiveSosIds === null) {
            this.lastActiveSosIds = activeSos.map(a => a.id);
        } else {
            const newSos = activeSos.filter(a => !this.lastActiveSosIds.includes(a.id));
            if (newSos.length > 0) {
                // Play emergency audio warning beep
                this.playEmergencySiren();
                
                // Show floating warning toast
                Utils.toast('🚨 EMERGENCY SOS DETECTED', `Urgent SOS alert activated by tourist ${newSos[0].touristId}!`, 'danger', 8000);
                
                // Highlight & Flash the Active Alerts stat box
                const alertStatBox = document.querySelector('.admin-mini-stat.alert-stat');
                if (alertStatBox) {
                    alertStatBox.classList.add('flash-alert');
                    setTimeout(() => alertStatBox.classList.remove('flash-alert'), 6000);
                }
            }
            this.lastActiveSosIds = activeSos.map(a => a.id);
        }
    },

    renderIncidentTable() {
        const tbody = document.getElementById('incident-tbody');
        if (!tbody) return;

        const filter = document.getElementById('incident-filter')?.value || 'all';
        let alerts = DB.getAlerts().sort((a, b) => b.timestamp - a.timestamp);

        if (filter === 'active') alerts = alerts.filter(a => a.status === 'active');
        else if (filter === 'resolved') alerts = alerts.filter(a => a.status === 'resolved');
        else if (filter === 'sos') alerts = alerts.filter(a => a.type === 'sos');

        tbody.innerHTML = alerts.slice(0, 20).map(a => {
            const tourist = DB.getTourist(a.touristId);
            const badgeClass = a.status === 'active' ? 'badge-active' :
                a.status === 'resolved' ? 'badge-resolved' : 'badge-pending';
            const riskBadge = a.riskScore > 65 ? 'badge-high' :
                a.riskScore > 30 ? 'badge-medium' : 'badge-low';
            const typeIcon = a.type === 'sos' ? '🆘' : a.type === 'geofence' ? '📍' : '🤖';

            return `<tr>
                <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-dim)">${a.id.substr(0, 8)}</td>
                <td>${tourist?.name || a.touristId}</td>
                <td>${typeIcon} ${a.type}</td>
                <td><span class="badge ${riskBadge}">${a.riskScore}</span></td>
                <td style="font-family:var(--font-mono);font-size:0.72rem">${a.lat?.toFixed(4) || '-'}, ${a.lng?.toFixed(4) || '-'}</td>
                <td style="font-size:0.78rem">${Utils.timeAgo(a.timestamp)}</td>
                <td><span class="badge ${badgeClass}">${a.status}</span></td>
                <td>
                    ${a.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="Admin.resolveAlert('${a.id}')"><i class="fas fa-check"></i></button>` : '—'}
                </td>
            </tr>`;
        }).join('');
    },

    resolveAlert(alertId) {
        const alerts = DB.getAlerts();
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'resolved';
            DB.saveAlert(alert);
            this.renderIncidentTable();
            this.updateStats();
            Utils.toast('Alert Resolved', `Alert ${alertId.substr(0, 8)} marked as resolved`, 'success');
        }
    },

    renderTouristList() {
        const listEl = document.getElementById('admin-tourist-list');
        if (!listEl) return;

        const tourists = DB.getTourists().filter(t => t.role === 'tourist');

        listEl.innerHTML = tourists.map(t => {
            const risk = this.getTouristRisk(t.id);
            const riskBadge = risk > 65 ? 'badge-high' : risk > 30 ? 'badge-medium' : 'badge-low';
            const initials = t.name.split(' ').map(n => n[0]).join('').substr(0, 2);

            return `
                <div class="tourist-list-item" onclick="Admin.showTouristDetail('${t.id}')">
                    <div class="tourist-avatar">${initials}</div>
                    <div class="tourist-list-info">
                        <div class="tourist-list-name">${t.name}</div>
                        <div class="tourist-list-phone">${t.phone}</div>
                    </div>
                    <div class="tourist-list-risk"><span class="badge ${riskBadge}">${risk}</span></div>
                </div>
            `;
        }).join('');
    },

    showTouristDetail(touristId) {
        const tourist = DB.getTourist(touristId);
        if (!tourist) return;

        const modal = document.getElementById('tourist-detail-modal');
        const body = document.getElementById('tourist-detail-body');

        const risk = this.getTouristRisk(touristId);
        const block = Blockchain.getIdentityBlock(touristId);
        const initials = tourist.name.split(' ').map(n => n[0]).join('').substr(0, 2);

        body.innerHTML = `
            <div class="tourist-detail-header">
                <div class="tourist-detail-avatar">${initials}</div>
                <div>
                    <div class="tourist-detail-name">${tourist.name}</div>
                    <div class="tourist-detail-phone">${tourist.phone}</div>
                </div>
                <span class="badge ${risk > 65 ? 'badge-high' : risk > 30 ? 'badge-medium' : 'badge-low'}" style="margin-left:auto;font-size:0.85rem;padding:6px 14px">Risk: ${risk}</span>
            </div>
            <div class="tourist-detail-grid">
                <div class="detail-field"><div class="detail-field-label">Tourist ID</div><div class="detail-field-value">${tourist.id}</div></div>
                <div class="detail-field"><div class="detail-field-label">Nationality</div><div class="detail-field-value">${tourist.nationality || 'N/A'}</div></div>
                <div class="detail-field"><div class="detail-field-label">Passport/Aadhar</div><div class="detail-field-value">${tourist.passport || 'N/A'}</div></div>
                <div class="detail-field"><div class="detail-field-label">Hotel</div><div class="detail-field-value">${tourist.hotel || 'N/A'}</div></div>
                <div class="detail-field"><div class="detail-field-label">Emergency Contact</div><div class="detail-field-value">${tourist.emergencyName || 'N/A'}</div></div>
                <div class="detail-field"><div class="detail-field-label">Emergency Phone</div><div class="detail-field-value">${tourist.emergencyPhone || 'N/A'}</div></div>
                <div class="detail-field"><div class="detail-field-label">Registered</div><div class="detail-field-value">${Utils.formatDateTime(tourist.registeredAt)}</div></div>
                <div class="detail-field"><div class="detail-field-label">Blockchain Hash</div><div class="detail-field-value" style="font-size:0.72rem;word-break:break-all;color:var(--accent)">${block?.data?.identityHash || 'Not verified'}</div></div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    setupEventListeners() {
        // Incident filter
        document.getElementById('incident-filter')?.addEventListener('change', () => {
            this.renderIncidentTable();
        });

        // Tourist detail modal close
        document.getElementById('tourist-detail-close')?.addEventListener('click', () => {
            document.getElementById('tourist-detail-modal').classList.add('hidden');
        });
        document.getElementById('tourist-detail-close-overlay')?.addEventListener('click', () => {
            document.getElementById('tourist-detail-modal').classList.add('hidden');
        });

        // Heatmap toggle (visual only)
        document.getElementById('admin-toggle-heatmap')?.addEventListener('click', () => {
            Utils.toast('Heatmap', 'Heatmap visualization toggled', 'info');
        });
    },

    startSimulation() {
        // Simulate tourist movement on admin map
        this.simInterval = setInterval(() => {
            Object.values(this.markers).forEach(({ marker, tourist }) => {
                const lat = marker.getLatLng().lat + Utils.rand(-0.001, 0.001);
                const lng = marker.getLatLng().lng + Utils.rand(-0.001, 0.001);
                marker.setLatLng([lat, lng]);

                // Update tourist in DB
                tourist.lat = lat;
                tourist.lng = lng;
                DB.saveTourist(tourist);
            });
        }, 4000);
    },

    destroy() {
        if (this.simInterval) clearInterval(this.simInterval);
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
        if (this.map) { this.map.remove(); this.map = null; }
    }
};
