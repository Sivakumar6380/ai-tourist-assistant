/* ================================================
   SafeTravel AI — Geo-Fencing Alert System
   ================================================ */

const GeoFence = {
    lastAlertZone: null,
    alertCooldown: {},

    check(lat, lng) {
        const zones = DB.getGeofences();
        let insideZone = null;

        for (const zone of zones) {
            const dist = Utils.haversine(lat, lng, zone.lat, zone.lng);
            if (dist <= zone.radius) {
                insideZone = zone;
                break;
            }
        }

        const statusEl = document.getElementById('geofence-status-text');

        if (insideZone) {
            if (statusEl) {
                statusEl.textContent = insideZone.name;
                statusEl.style.color = insideZone.riskLevel === 'high' ? 'var(--danger)' :
                    insideZone.riskLevel === 'medium' ? 'var(--warning)' : 'var(--text)';
            }

            // Alert cooldown: don't spam for same zone
            const now = Date.now();
            if (!this.alertCooldown[insideZone.id] || now - this.alertCooldown[insideZone.id] > 60000) {
                this.alertCooldown[insideZone.id] = now;
                this.triggerAlert(insideZone, lat, lng);
            }
        } else {
            if (statusEl) {
                statusEl.textContent = 'Safe Zone';
                statusEl.style.color = 'var(--success)';
            }
            this.lastAlertZone = null;
        }

        return insideZone;
    },

    triggerAlert(zone, lat, lng) {
        const level = zone.riskLevel === 'high' ? 'danger' : 'warning';
        const title = zone.riskLevel === 'high' ? '⚠️ DANGER ZONE' : '⚡ Caution Zone';

        Utils.toast(title, `You entered: ${zone.name} (${zone.type})`, level, 6000);

        // Create alert record
        const alert = {
            id: 'A' + Utils.uid(),
            touristId: Auth.currentUser?.id,
            type: 'geofence',
            riskScore: zone.riskLevel === 'high' ? Utils.randInt(70, 90) :
                zone.riskLevel === 'medium' ? Utils.randInt(40, 65) : Utils.randInt(15, 35),
            message: `Entered ${zone.riskLevel}-risk zone: ${zone.name}`,
            lat: lat,
            lng: lng,
            zoneName: zone.name,
            status: 'active',
            timestamp: Date.now()
        };

        DB.saveAlert(alert);
        this.updateAlertsList();
        this.lastAlertZone = zone;
    },

    updateAlertsList() {
        const listEl = document.getElementById('tourist-alerts-list');
        if (!listEl) return;

        const touristId = Auth.currentUser?.id;
        if (!touristId) return;

        const alerts = DB.getAlerts()
            .filter(a => a.touristId === touristId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

        if (alerts.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No alerts — You\'re safe!</p></div>';
            return;
        }

        listEl.innerHTML = alerts.map(a => {
            const cls = a.riskScore > 65 ? 'alert-high' : a.riskScore > 30 ? '' : 'alert-low';
            const icon = a.type === 'sos' ? 'fa-exclamation-triangle' :
                a.type === 'geofence' ? 'fa-draw-polygon' : 'fa-brain';
            return `
                <div class="alert-item ${cls}">
                    <i class="fas ${icon}"></i>
                    <span class="alert-item-text">${a.message}</span>
                    <span class="alert-item-time">${Utils.timeAgo(a.timestamp)}</span>
                </div>
            `;
        }).join('');
    },

    getClosestZone(lat, lng) {
        const zones = DB.getGeofences();
        let closest = null;
        let minDist = Infinity;

        zones.forEach(zone => {
            const dist = Utils.haversine(lat, lng, zone.lat, zone.lng);
            if (dist < minDist) {
                minDist = dist;
                closest = { ...zone, distance: dist };
            }
        });

        return closest;
    }
};
