/* ================================================
   SafeTravel AI — GPS Tracking Module
   Real-time live location with browser Geolocation API
   ================================================ */

const GPS = {
    map: null,
    marker: null,
    accuracyCircle: null,
    routeLine: null,
    watchId: null,
    currentPos: null,
    positions: [],
    isTracking: false,
    geofenceLayerGroup: null,
    _lastGeocode: 0,
    _geocodeDelay: 5000,
    _currentAddress: 'Detecting...',
    _lastAccuracy: null,
    _permissionState: 'unknown', // 'unknown', 'granted', 'denied', 'prompt'
    _liveMode: false, // true = real GPS, false = simulation
    _retryCount: 0,
    _maxRetries: 3,

    initMap(containerId, center = [28.6139, 77.2090], zoom = 13) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        // Destroy existing map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        const map = L.map(containerId, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        // Attribution
        L.control.attribution({ prefix: false }).addTo(map);

        this.geofenceLayerGroup = L.layerGroup().addTo(map);

        return map;
    },

    initTouristMap() {
        this.map = this.initMap('tourist-map');
        if (!this.map) return;

        // Tourist marker with animated pulsing dot
        const touristIcon = L.divIcon({
            html: `<div class="live-marker">
                <div class="live-marker-pulse"></div>
                <div class="live-marker-dot"></div>
            </div>`,
            className: 'live-marker-container',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        this.marker = L.marker([28.6139, 77.2090], { icon: touristIcon }).addTo(this.map);

        // Accuracy circle
        this.accuracyCircle = L.circle([28.6139, 77.2090], {
            radius: 50,
            color: '#00d4ff',
            fillColor: '#00d4ff',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '4,4'
        }).addTo(this.map);

        this.routeLine = L.polyline([], {
            color: '#00d4ff',
            weight: 3,
            opacity: 0.6,
            dashArray: '8,8'
        }).addTo(this.map);

        // Draw geofences
        this.drawGeofences(this.map, this.geofenceLayerGroup);

        // Start tracking
        this.startTracking();

        // Setup buttons
        document.getElementById('center-map-btn').onclick = () => {
            if (this.currentPos) {
                this.map.setView([this.currentPos.lat, this.currentPos.lng], 15, {
                    animate: true,
                    duration: 0.8
                });
            }
        };

        document.getElementById('toggle-geofence-btn').onclick = () => {
            if (this.map.hasLayer(this.geofenceLayerGroup)) {
                this.geofenceLayerGroup.clearLayers();
            } else {
                this.drawGeofences(this.map, this.geofenceLayerGroup);
            }
        };

        // Setup refresh location button
        const refreshBtn = document.getElementById('refresh-location-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshCurrentLocation();
        }
    },

    drawGeofences(map, layerGroup) {
        layerGroup.clearLayers();
        const zones = DB.getGeofences();
        zones.forEach(zone => {
            const color = zone.riskLevel === 'high' ? '#ff3366' :
                zone.riskLevel === 'medium' ? '#ffaa00' : '#00ff88';

            L.circle([zone.lat, zone.lng], {
                radius: zone.radius,
                color: color,
                fillColor: color,
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5,5'
            }).bindPopup(`
                <div style="color:#111;font-family:Inter,sans-serif">
                    <strong>${zone.name}</strong><br>
                    Risk: <span style="color:${color};font-weight:700">${zone.riskLevel.toUpperCase()}</span><br>
                    Type: ${zone.type}<br>
                    Radius: ${zone.radius}m
                </div>
            `).addTo(layerGroup);
        });
    },

    /* ============ PERMISSION HANDLING ============ */

    async _checkPermission() {
        if (!navigator.permissions) return 'prompt';
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            this._permissionState = result.state;

            // Listen for permission changes
            result.onchange = () => {
                this._permissionState = result.state;
                this._updatePermissionUI(result.state);
                if (result.state === 'granted' && !this._liveMode) {
                    // Permission just got granted — switch to live
                    this._switchToLive();
                }
            };

            return result.state;
        } catch (e) {
            return 'prompt';
        }
    },

    _updatePermissionUI(state) {
        const badge = document.getElementById('gps-mode-badge');
        const gpsStatus = document.getElementById('gps-status-text');

        if (state === 'granted') {
            if (badge) {
                badge.textContent = 'LIVE';
                badge.className = 'gps-mode-badge gps-live';
            }
            if (gpsStatus) {
                gpsStatus.textContent = 'Live GPS';
                gpsStatus.style.color = 'var(--success)';
            }
        } else if (state === 'denied') {
            if (badge) {
                badge.textContent = 'SIM';
                badge.className = 'gps-mode-badge gps-sim';
            }
            if (gpsStatus) {
                gpsStatus.textContent = 'Simulated';
                gpsStatus.style.color = 'var(--warning)';
            }
        }
    },

    _showPermissionPrompt() {
        const card = document.getElementById('my-location-card');
        if (!card) return;

        // Check if prompt already exists
        if (document.getElementById('gps-permission-prompt')) return;

        const prompt = document.createElement('div');
        prompt.id = 'gps-permission-prompt';
        prompt.className = 'gps-permission-prompt';
        prompt.innerHTML = `
            <div class="gps-perm-icon"><i class="fas fa-location-crosshairs"></i></div>
            <div class="gps-perm-content">
                <h4>Enable Live Location</h4>
                <p>Allow GPS access for real-time tracking of your position on the map</p>
            </div>
            <button class="btn btn-primary btn-sm" id="gps-enable-btn">
                <i class="fas fa-location-arrow"></i> Enable GPS
            </button>
            <button class="btn btn-ghost btn-sm" id="gps-skip-btn">
                <i class="fas fa-forward"></i> Use Simulated
            </button>
        `;

        card.querySelector('.my-location-body').prepend(prompt);

        document.getElementById('gps-enable-btn').onclick = () => {
            prompt.classList.add('fade-out');
            setTimeout(() => prompt.remove(), 400);
            this._requestLiveLocation();
        };

        document.getElementById('gps-skip-btn').onclick = () => {
            prompt.classList.add('fade-out');
            setTimeout(() => prompt.remove(), 400);
            this.startSimulation();
        };
    },

    /* ============ TRACKING CORE ============ */

    async startTracking() {
        if (this.isTracking) return;
        this.isTracking = true;

        // Show acquiring state on location card
        this._setLocationAcquiring();

        if (!('geolocation' in navigator)) {
            // No Geolocation API at all
            this._updatePermissionUI('denied');
            this._setLocationStatus('unavailable');
            this.startSimulation();
            return;
        }

        // Check permission state
        const perm = await this._checkPermission();

        if (perm === 'granted') {
            // Already have permission — go straight to live
            this._requestLiveLocation();
        } else if (perm === 'denied') {
            // Denied — use simulation, show a hint to re-enable
            this._updatePermissionUI('denied');
            Utils.toast('GPS Denied', 'Location permission was denied. Using simulated tracking.', 'warning');
            this.startSimulation();
        } else {
            // 'prompt' — show a nice UI prompt first, then ask
            this._showPermissionPrompt();
            // Start simulation in background so the map isn't blank
            this.startSimulation();
        }
    },

    _requestLiveLocation() {
        const gpsStatus = document.getElementById('gps-status-text');

        // Stop any existing simulation
        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
        }

        // Clear any existing watch
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (gpsStatus) {
            gpsStatus.textContent = 'Acquiring...';
            gpsStatus.style.color = 'var(--warning)';
        }

        this._setLocationAcquiring();

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                this._liveMode = true;
                this._retryCount = 0;
                this._lastAccuracy = pos.coords.accuracy;

                this.updatePosition(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    pos.coords.speed || 0
                );

                // Update accuracy circle
                if (this.accuracyCircle) {
                    this.accuracyCircle.setLatLng([pos.coords.latitude, pos.coords.longitude]);
                    this.accuracyCircle.setRadius(Math.min(pos.coords.accuracy, 500));
                }

                this._updatePermissionUI('granted');

                // Center map on first live position
                if (this.positions.length <= 2 && this.map) {
                    this.map.setView([pos.coords.latitude, pos.coords.longitude], 16, {
                        animate: true,
                        duration: 1.2
                    });
                }
            },
            (err) => {
                console.log('[GPS] Live location error:', err.message, '(code:', err.code, ')');
                this._retryCount++;

                if (err.code === 1) {
                    // PERMISSION_DENIED
                    this._updatePermissionUI('denied');
                    Utils.toast('GPS Denied', 'Location access denied. Using simulated position.', 'warning');
                    this.startSimulation();
                } else if (err.code === 2) {
                    // POSITION_UNAVAILABLE
                    if (this._retryCount <= this._maxRetries) {
                        Utils.toast('GPS Signal', `Trying to acquire GPS signal (attempt ${this._retryCount}/${this._maxRetries})...`, 'info', 2000);
                    } else {
                        Utils.toast('GPS Unavailable', 'Cannot get position. Using simulation.', 'warning');
                        this.startSimulation();
                    }
                } else if (err.code === 3) {
                    // TIMEOUT
                    if (this._retryCount <= this._maxRetries) {
                        Utils.toast('GPS Timeout', `GPS signal weak, retrying (${this._retryCount}/${this._maxRetries})...`, 'info', 2000);
                    } else {
                        Utils.toast('GPS Timeout', 'Could not acquire GPS. Using simulated tracking.', 'warning');
                        this.startSimulation();
                    }
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 15000
            }
        );
    },

    _switchToLive() {
        // Called when permission changes to granted mid-session
        Utils.toast('GPS Enabled', 'Switching to live location tracking!', 'success');
        this._requestLiveLocation();
    },

    startSimulation() {
        if (this.simInterval) return; // Already simulating
        this._liveMode = false;

        // Simulate movement around tourist's registered location
        const tourist = Auth.currentUser;
        if (!tourist) return;

        let lat = tourist.lat || 28.6139;
        let lng = tourist.lng || 77.2090;

        const gpsStatus = document.getElementById('gps-status-text');
        if (gpsStatus) {
            gpsStatus.textContent = 'Simulated';
            gpsStatus.style.color = 'var(--warning)';
        }

        const badge = document.getElementById('gps-mode-badge');
        if (badge) {
            badge.textContent = 'SIM';
            badge.className = 'gps-mode-badge gps-sim';
        }

        // Immediate first position
        this._lastAccuracy = Utils.rand(5, 50);
        this.updatePosition(lat, lng, Utils.rand(0.5, 3));

        this.simInterval = setInterval(() => {
            lat += Utils.rand(-0.0003, 0.0003);
            lng += Utils.rand(-0.0003, 0.0003);
            const speed = Utils.rand(0.5, 5);
            this._lastAccuracy = Utils.rand(5, 50);
            this.updatePosition(lat, lng, speed);
        }, 3000);
    },

    updatePosition(lat, lng, speed = 0) {
        this.currentPos = { lat, lng, speed, timestamp: Date.now() };
        this.positions.push(this.currentPos);

        // Keep last 200
        if (this.positions.length > 200) this.positions.shift();

        // Update map
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        }
        if (this.routeLine) {
            this.routeLine.setLatLngs(this.positions.map(p => [p.lat, p.lng]));
        }

        // Update accuracy circle
        if (this.accuracyCircle && this._lastAccuracy) {
            this.accuracyCircle.setLatLng([lat, lng]);
            this.accuracyCircle.setRadius(Math.min(this._lastAccuracy, 500));
        }

        // Save to DB
        DB.saveLocation({
            touristId: Auth.currentUser?.id,
            lat, lng, speed,
            timestamp: Date.now()
        });

        // Check geofences
        GeoFence.check(lat, lng);

        // Update AI risk
        AIRisk.evaluate();

        // Update My Current Location card
        this._updateLocationCard(lat, lng);
    },

    /* ============ MY CURRENT LOCATION CARD ============ */

    _setLocationAcquiring() {
        const addrEl = document.getElementById('my-location-address');
        if (addrEl) {
            addrEl.textContent = 'Acquiring GPS signal...';
            addrEl.classList.add('location-acquiring');
        }
    },

    _setLocationStatus(status) {
        const gpsStatus = document.getElementById('gps-status-text');
        if (status === 'unavailable' && gpsStatus) {
            gpsStatus.textContent = 'Unavailable';
            gpsStatus.style.color = 'var(--danger)';
        }
    },

    _updateLocationCard(lat, lng) {
        const latEl = document.getElementById('my-location-lat');
        const lngEl = document.getElementById('my-location-lng');
        const accEl = document.getElementById('my-location-accuracy');
        const timeEl = document.getElementById('my-location-time');
        const addrEl = document.getElementById('my-location-address');

        // Update coordinates
        if (latEl) latEl.textContent = lat.toFixed(6) + '°';
        if (lngEl) lngEl.textContent = lng.toFixed(6) + '°';

        // Update accuracy
        if (accEl) {
            if (this._liveMode && this._lastAccuracy != null) {
                const acc = Math.round(this._lastAccuracy);
                accEl.textContent = `±${acc}m`;
                accEl.style.color = acc < 20 ? 'var(--success)' : acc < 100 ? 'var(--warning)' : 'var(--danger)';
            } else if (this._lastAccuracy != null) {
                accEl.textContent = 'Simulated';
                accEl.style.color = 'var(--text-dim)';
            } else {
                accEl.textContent = '—';
                accEl.style.color = 'var(--text-dim)';
            }
        }

        // Update timestamp
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = 'Last updated: ' + now.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }

        // Remove acquiring animation
        if (addrEl) addrEl.classList.remove('location-acquiring');

        // Reverse geocode (debounced to avoid API rate limits)
        const now = Date.now();
        if (now - this._lastGeocode > this._geocodeDelay) {
            this._lastGeocode = now;
            this._reverseGeocode(lat, lng);
        }
    },

    async _reverseGeocode(lat, lng) {
        const addrEl = document.getElementById('my-location-address');
        if (!addrEl) return;

        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!resp.ok) throw new Error('Geocode failed');
            const data = await resp.json();

            if (data && data.display_name) {
                // Build a shorter, readable address
                const addr = data.address || {};
                const parts = [];
                if (addr.road || addr.pedestrian) parts.push(addr.road || addr.pedestrian);
                if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
                if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                if (addr.state) parts.push(addr.state);

                this._currentAddress = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', ');
                addrEl.textContent = this._currentAddress;
            }
        } catch (e) {
            console.log('[GPS] Reverse geocode error:', e.message);
            // Fallback address based on known zones
            const zone = GeoFence.getClosestZone(lat, lng);
            this._currentAddress = zone ? `Near ${zone.name}` : `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
            addrEl.textContent = this._currentAddress;
        }
    },

    refreshCurrentLocation() {
        const refreshBtn = document.getElementById('refresh-location-btn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
            setTimeout(() => refreshBtn.classList.remove('spinning'), 700);
        }

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this._liveMode = true;
                    this._lastAccuracy = pos.coords.accuracy;
                    this.updatePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0);
                    // Force geocode refresh
                    this._lastGeocode = 0;
                    this._updateLocationCard(pos.coords.latitude, pos.coords.longitude);

                    // Center map
                    if (this.map) {
                        this.map.setView([pos.coords.latitude, pos.coords.longitude], 16, {
                            animate: true, duration: 0.8
                        });
                    }

                    // Update accuracy circle
                    if (this.accuracyCircle) {
                        this.accuracyCircle.setLatLng([pos.coords.latitude, pos.coords.longitude]);
                        this.accuracyCircle.setRadius(Math.min(pos.coords.accuracy, 500));
                    }

                    this._updatePermissionUI('granted');
                    Utils.toast('Location Updated', 'Your live GPS position has been refreshed', 'success');
                },
                (err) => {
                    Utils.toast('Location Error', 'Could not refresh GPS position: ' + err.message, 'warning');
                    // Update with current simulated position
                    if (this.currentPos) {
                        this._lastGeocode = 0;
                        this._updateLocationCard(this.currentPos.lat, this.currentPos.lng);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else if (this.currentPos) {
            this._lastGeocode = 0;
            this._updateLocationCard(this.currentPos.lat, this.currentPos.lng);
            Utils.toast('Location Refreshed', 'Using simulated position', 'info');
        }
    },

    getAddress() {
        return this._currentAddress;
    },

    isLive() {
        return this._liveMode;
    },

    stopTracking() {
        this.isTracking = false;
        this._liveMode = false;
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.simInterval) {
            clearInterval(this.simInterval);
            this.simInterval = null;
        }
    },

    getCurrentCoords() {
        return this.currentPos;
    },

    // ==================== Safety Routing & Emergency Services (SIH Features) ====================
    safestPolyline: null,
    shortestPolyline: null,
    serviceMarkers: [],

    toggleSafetyRoute(mode) {
        if (!this.map) return;

        // Clear existing polylines
        if (this.safestPolyline) { this.map.removeLayer(this.safestPolyline); this.safestPolyline = null; }
        if (this.shortestPolyline) { this.map.removeLayer(this.shortestPolyline); this.shortestPolyline = null; }

        if (mode === 'safest') {
            // Safest Route (AI Protected): glowing green polyline going around Paharganj, near police posts!
            const coords = [
                [28.6139, 77.2090], // Taj Palace
                [28.6210, 77.2100], // Parliament St Police Station (ES001)
                [28.6300, 77.2185], // Connaught Place Police Post (ES002)
                [28.6380, 77.2250], // Safe bypass road
                [28.6562, 77.2310]  // Old Delhi Center
            ];
            this.safestPolyline = L.polyline(coords, {
                color: '#00ff88',
                weight: 5,
                opacity: 0.85,
                className: 'route-safest-glowing'
            }).addTo(this.map);

            this.map.fitBounds(this.safestPolyline.getBounds(), { padding: [50, 50] });
            Utils.toast('Safest Route Active', 'AI routed away from danger zones and close to police boxes.', 'success');
            
            if (window.Features && typeof Features.checkProactiveGuardian === 'function') {
                Features.checkProactiveGuardian('safest');
            }
        } else if (mode === 'shortest') {
            // Shortest Route (Danger!): red dashed polyline going straight through Paharganj (GF002)!
            const coords = [
                [28.6139, 77.2090], // Taj Palace
                [28.6300, 77.2110], // Straight road path
                [28.6430, 77.2130], // DIRECT ENTRY INTO DANGER ZONE (Paharganj GF002)!
                [28.6562, 77.2310]  // Old Delhi Center
            ];
            this.shortestPolyline = L.polyline(coords, {
                color: '#ff3366',
                weight: 4,
                opacity: 0.75,
                dashArray: '8, 8',
                className: 'route-shortest'
            }).addTo(this.map);

            this.map.fitBounds(this.shortestPolyline.getBounds(), { padding: [50, 50] });
            Utils.toast('Shortest Route Warning', 'Route intersects High Risk zone (Paharganj)! Scams & Crime detected.', 'danger');
            
            if (window.Features && typeof Features.checkProactiveGuardian === 'function') {
                Features.checkProactiveGuardian('shortest');
            }
        }
    },

    showServiceCategory(category) {
        if (!this.map) return;

        // Clear existing markers
        this.clearServiceMarkers();

        const pos = this.getCurrentCoords() || { lat: 28.6139, lng: 77.2090 };
        const services = DB.getEmergencyServices().filter(s => category === 'all' || s.type === category);

        if (services.length === 0) {
            Utils.toast('No Services Found', `No registered ${category} found in this region.`, 'warning');
            return;
        }

        const icons = {
            police: { color: '#00d4ff', icon: 'fa-shield-halved' },
            hospital: { color: '#ff3366', icon: 'fa-square-h' },
            pharmacy: { color: '#00ff88', icon: 'fa-pills' },
            embacy: { color: '#9d4edd', icon: 'fa-flag' }
        };

        services.forEach(s => {
            const cfg = icons[s.type] || { color: '#ffaa00', icon: 'fa-location-dot' };
            const divIcon = L.divIcon({
                html: `<div class="service-marker" style="background: ${cfg.color}; border: 1px solid var(--text); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(0,0,0,0.5);">
                    <i class="fas ${cfg.icon}" style="color: #fff; font-size: 11px;"></i>
                </div>`,
                className: 'service-marker-container',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            const distance = Utils.haversine(pos.lat, pos.lng, s.lat, s.lng);
            const marker = L.marker([s.lat, s.lng], { icon: divIcon })
                .addTo(this.map)
                .bindPopup(`
                    <div class="map-popup-card" style="padding: var(--space-xs); font-family: var(--font);">
                        <span class="popup-tag" style="background: ${cfg.color}22; color: ${cfg.color}; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-sm);">${s.type.toUpperCase()}</span>
                        <h4 style="margin: 6px 0; font-size: 13px; font-weight: 600; color: var(--text);">${s.name}</h4>
                        <p style="margin: 2px 0; font-size: 11px; color: var(--text-dim);"><i class="fas fa-route"></i> Distance: <strong>${(distance / 1000).toFixed(2)} km</strong></p>
                        <p style="margin: 2px 0; font-size: 11px; color: var(--text-dim);"><i class="fas fa-phone"></i> Contact: <strong>${s.contact}</strong></p>
                        <button class="btn btn-sm btn-accent btn-full mt-sm" style="font-size: 10px; padding: 4px;" onclick="GPS.routeToService([${s.lat}, ${s.lng}], '${s.name.replace(/'/g, "\\'")}')">Plot Navigation</button>
                    </div>
                `);

            this.serviceMarkers.push(marker);
        });

        Utils.toast('Emergency Finder', `Mapped nearest ${category} support channels on your live screen.`, 'success');
    },

    clearServiceMarkers() {
        this.serviceMarkers.forEach(m => {
            if (this.map) this.map.removeLayer(m);
        });
        this.serviceMarkers = [];
    },

    routeToService(targetCoords, name) {
        if (!this.map) return;
        const pos = this.getCurrentCoords() || { lat: 28.6139, lng: 77.2090 };

        if (this.safestPolyline) { this.map.removeLayer(this.safestPolyline); }
        if (this.shortestPolyline) { this.map.removeLayer(this.shortestPolyline); }

        this.safestPolyline = L.polyline([
            [pos.lat, pos.lng],
            targetCoords
        ], {
            color: '#00ff88',
            weight: 5,
            opacity: 0.85
        }).addTo(this.map);

        this.map.fitBounds(this.safestPolyline.getBounds(), { padding: [50, 50] });
        Utils.toast('Plotting Safety Path', `Navigating to ${name}`, 'success');
    },

    // Route Safety Recommendation Toggle (Safest vs Shortest)
    safestPolylineRoute: null,
    shortestPolylineRoute: null,

    toggleSafetyRoute(type) {
        if (!this.map) return;
        const pos = this.getCurrentCoords() || { lat: 28.6139, lng: 77.2090 };

        // Clear existing route lines
        if (this.safestPolylineRoute) { this.map.removeLayer(this.safestPolylineRoute); this.safestPolylineRoute = null; }
        if (this.shortestPolylineRoute) { this.map.removeLayer(this.shortestPolylineRoute); this.shortestPolylineRoute = null; }

        // Simulated waypoints
        const destination = [28.6562, 77.2310]; // Old Delhi

        if (type === 'safest') {
            // Longer but avoids danger zones
            const safeWaypoints = [
                [pos.lat, pos.lng],
                [28.6250, 77.2150],
                [28.6350, 77.2200],
                [28.6450, 77.2250],
                destination
            ];
            this.safestPolylineRoute = L.polyline(safeWaypoints, {
                color: '#00ff88',
                weight: 5,
                opacity: 0.85,
                dashArray: null,
                className: 'route-safest-glowing'
            }).addTo(this.map);
            this.map.fitBounds(this.safestPolylineRoute.getBounds(), { padding: [50, 50] });
            Utils.toast('AI Safest Route', 'Optimized path avoiding high-crime geofences. +3 min travel time.', 'success');
        } else {
            // Shorter but passes through danger zones
            const shortWaypoints = [
                [pos.lat, pos.lng],
                [28.6430, 77.2130], // Through Paharganj danger zone
                destination
            ];
            this.shortestPolylineRoute = L.polyline(shortWaypoints, {
                color: '#ff3366',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 8',
                className: 'route-shortest'
            }).addTo(this.map);
            this.map.fitBounds(this.shortestPolylineRoute.getBounds(), { padding: [50, 50] });
            Utils.toast('⚠️ Shortest Route', 'Warning: This path crosses Paharganj Scam Zone. Proceed with caution.', 'warning');
        }

        // Trigger Predictive Guardian AI
        if (window.Features && typeof Features.checkProactiveGuardian === 'function') {
            Features.checkProactiveGuardian(type);
        }
    }
};
