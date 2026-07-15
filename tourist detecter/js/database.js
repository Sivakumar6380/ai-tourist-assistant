/* ================================================
   SafeTravel AI — Database (localStorage Persistence)
   ================================================ */

const DB = {
    _get(key) {
        try { return JSON.parse(localStorage.getItem('st_' + key)) || []; }
        catch { return []; }
    },
    _set(key, data) {
        localStorage.setItem('st_' + key, JSON.stringify(data));
    },

    // ==================== Tourists ====================
    getTourists() { return this._get('tourists'); },
    getTourist(id) { return this.getTourists().find(t => t.id === id); },
    saveTourist(tourist) {
        const all = this.getTourists();
        const idx = all.findIndex(t => t.id === tourist.id);
        if (idx >= 0) all[idx] = tourist;
        else all.push(tourist);
        this._set('tourists', all);
    },

    // ==================== Locations ====================
    getLocations(touristId) {
        return this._get('locations').filter(l => l.touristId === touristId);
    },
    getAllLocations() { return this._get('locations'); },
    saveLocation(loc) {
        const all = this._get('locations');
        all.push(loc);
        // Keep last 500 entries per tourist
        const filtered = {};
        all.forEach(l => {
            if (!filtered[l.touristId]) filtered[l.touristId] = [];
            filtered[l.touristId].push(l);
        });
        const trimmed = [];
        Object.values(filtered).forEach(arr => {
            trimmed.push(...arr.slice(-500));
        });
        this._set('locations', trimmed);
    },

    // ==================== Alerts ====================
    getAlerts() { return this._get('alerts'); },
    saveAlert(alert) {
        const all = this.getAlerts();
        const idx = all.findIndex(a => a.id === alert.id);
        if (idx >= 0) all[idx] = alert;
        else all.push(alert);
        this._set('alerts', all);
    },
    getActiveAlerts() {
        return this.getAlerts().filter(a => a.status === 'active');
    },

    // ==================== Blockchain ====================
    getChain() { return this._get('blockchain'); },
    saveChain(chain) { this._set('blockchain', chain); },

    // ==================== Sessions ====================
    getSession() {
        try { return JSON.parse(localStorage.getItem('st_session')); }
        catch { return null; }
    },
    setSession(session) {
        localStorage.setItem('st_session', JSON.stringify(session));
    },
    clearSession() {
        localStorage.removeItem('st_session');
    },

    // ==================== Geofences ====================
    getGeofences() { return this._get('geofences'); },
    saveGeofences(zones) { this._set('geofences', zones); },

    // ==================== Taxi Database ====================
    getTaxis() { return this._get('taxis'); },
    getTaxi(plate) { 
        const clean = p => p.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return this.getTaxis().find(t => clean(t.plate) === clean(plate));
    },
    saveTaxi(taxi) {
        const all = this.getTaxis();
        const idx = all.findIndex(t => t.plate === taxi.plate);
        if (idx >= 0) all[idx] = taxi;
        else all.push(taxi);
        this._set('taxis', all);
    },

    // ==================== Emergency Services ====================
    getEmergencyServices() { return this._get('emergency_services'); },
    saveEmergencyServices(services) { this._set('emergency_services', services); },

    // ==================== Weather Alerts ====================
    getWeatherAlerts() { return this._get('weather_alerts'); },
    saveWeatherAlerts(alerts) { this._set('weather_alerts', alerts); },

    // ==================== Seed Data ====================
    isSeeded() { return localStorage.getItem('st_seeded') === '1'; },
    markSeeded() { localStorage.setItem('st_seeded', '1'); },

    seedData() {
        if (this.isSeeded() && this.getCrowdedAreas().length > 0) return;

        // Seed tourists
        const tourists = [
            { id: 'T001', name: 'Rahul Sharma', phone: '+91 9876543210', email: 'rahul@email.com', password: '123456', passport: 'A12345678', nationality: 'Indian', hotel: 'Taj Palace, Delhi', emergencyName: 'Priya Sharma', emergencyPhone: '+91 9876543211', role: 'tourist', registeredAt: Date.now() - 86400000 * 3, lat: 28.6139, lng: 77.2090 },
            { id: 'T002', name: 'Sarah Johnson', phone: '+1 5551234567', email: 'sarah@email.com', password: '123456', passport: 'US789456', nationality: 'American', hotel: 'Oberoi, Mumbai', emergencyName: 'Mike Johnson', emergencyPhone: '+1 5559876543', role: 'tourist', registeredAt: Date.now() - 86400000 * 2, lat: 19.0760, lng: 72.8777 },
            { id: 'T003', name: 'Akira Tanaka', phone: '+81 9012345678', email: 'akira@email.com', password: '123456', passport: 'JP456123', nationality: 'Japanese', hotel: 'Rambagh Palace, Jaipur', emergencyName: 'Yuki Tanaka', emergencyPhone: '+81 9087654321', role: 'tourist', registeredAt: Date.now() - 86400000 * 1, lat: 26.9124, lng: 75.7873 },
            { id: 'T004', name: 'Emma Williams', phone: '+44 7911123456', email: 'emma@email.com', password: '123456', passport: 'UK321654', nationality: 'British', hotel: 'ITC Maurya, Delhi', emergencyName: 'James Williams', emergencyPhone: '+44 7911654321', role: 'tourist', registeredAt: Date.now() - 86400000 * 1, lat: 28.5355, lng: 77.2100 },
            { id: 'T005', name: 'Pierre Dubois', phone: '+33 612345678', email: 'pierre@email.com', password: '123456', passport: 'FR654987', nationality: 'French', hotel: 'Leela Palace, Delhi', emergencyName: 'Marie Dubois', emergencyPhone: '+33 698765432', role: 'tourist', registeredAt: Date.now() - 3600000 * 5, lat: 28.6304, lng: 77.2177 },
            { id: 'T006', name: 'Priya Patel', phone: '+91 8765432109', email: 'priya.p@email.com', password: '123456', passport: 'AADH987654321', nationality: 'Indian', hotel: 'Hotel Rajputana, Jaipur', emergencyName: 'Amit Patel', emergencyPhone: '+91 8765432110', role: 'tourist', registeredAt: Date.now() - 3600000 * 8, lat: 26.9196, lng: 75.7878 },
            { id: 'T007', name: 'Hans Mueller', phone: '+49 15112345678', email: 'hans@email.com', password: '123456', passport: 'DE159753', nationality: 'German', hotel: 'Marriott, Mumbai', emergencyName: 'Greta Mueller', emergencyPhone: '+49 15198765432', role: 'tourist', registeredAt: Date.now() - 3600000 * 2, lat: 19.0826, lng: 72.8710 },
            { id: 'T008', name: 'Li Wei Chen', phone: '+86 13912345678', email: 'liwei@email.com', password: '123456', passport: 'CN852963', nationality: 'Chinese', hotel: 'Hyatt Regency, Delhi', emergencyName: 'Wang Chen', emergencyPhone: '+86 13998765432', role: 'tourist', registeredAt: Date.now() - 3600000 * 1, lat: 28.6353, lng: 77.2250 }
        ];

        // Admin account
        tourists.push({
            id: 'ADMIN', name: 'Admin Control', phone: 'admin', password: 'admin123',
            role: 'admin', registeredAt: Date.now() - 86400000 * 30
        });

        tourists.forEach(t => this.saveTourist(t));

        // Seed danger zones (geofences)
        const zones = [
            { id: 'GF001', name: 'Old Delhi Night Zone', lat: 28.6562, lng: 77.2310, radius: 800, riskLevel: 'high', crimeRate: 7.5, type: 'High Crime Area' },
            { id: 'GF002', name: 'Paharganj Area', lat: 28.6430, lng: 77.2130, radius: 600, riskLevel: 'medium', crimeRate: 5.2, type: 'Tourist Scam Zone' },
            { id: 'GF003', name: 'Dharavi Border', lat: 19.0425, lng: 72.8551, radius: 1000, riskLevel: 'high', crimeRate: 6.8, type: 'Restricted Zone' },
            { id: 'GF004', name: 'Juhu Beach Night', lat: 19.0948, lng: 72.8267, radius: 500, riskLevel: 'medium', crimeRate: 4.5, type: 'Night Risk Zone' },
            { id: 'GF005', name: 'Jaipur Old Market', lat: 26.9238, lng: 75.8267, radius: 400, riskLevel: 'low', crimeRate: 3.2, type: 'Pickpocket Zone' },
            { id: 'GF006', name: 'Yamuna Bank Area', lat: 28.6265, lng: 77.2485, radius: 700, riskLevel: 'high', crimeRate: 8.1, type: 'Natural Hazard' }
        ];
        this.saveGeofences(zones);

        // Seed some alerts
        const alerts = [
            { id: 'A001', touristId: 'T002', type: 'geofence', riskScore: 72, message: 'Entered high-risk zone: Dharavi Border', lat: 19.0420, lng: 72.8545, status: 'active', timestamp: Date.now() - 3600000 * 2 },
            { id: 'A002', touristId: 'T001', type: 'ai_risk', riskScore: 58, message: 'Unusual movement pattern detected', lat: 28.6140, lng: 77.2095, status: 'resolved', timestamp: Date.now() - 86400000 },
            { id: 'A003', touristId: 'T005', type: 'sos', riskScore: 95, message: 'SOS Emergency activated', lat: 28.6310, lng: 77.2180, status: 'active', timestamp: Date.now() - 1800000 },
            { id: 'A004', touristId: 'T003', type: 'geofence', riskScore: 45, message: 'Near pickpocket zone: Jaipur Old Market', lat: 26.9240, lng: 75.8270, status: 'resolved', timestamp: Date.now() - 7200000 },
            { id: 'A005', touristId: 'T007', type: 'ai_risk', riskScore: 67, message: 'Late night movement in unfamiliar area', lat: 19.0830, lng: 72.8715, status: 'active', timestamp: Date.now() - 900000 }
        ];
        alerts.forEach(a => this.saveAlert(a));

        // Seed some location history
        tourists.filter(t => t.role === 'tourist').forEach(t => {
            for (let i = 0; i < 20; i++) {
                this.saveLocation({
                    touristId: t.id,
                    lat: t.lat + Utils.rand(-0.005, 0.005),
                    lng: t.lng + Utils.rand(-0.005, 0.005),
                    speed: Utils.rand(0, 8),
                    timestamp: Date.now() - (20 - i) * 300000
                });
            }
        });

        // Seed taxi cab registration database (Feature 5)
        const taxis = [
            { plate: 'DL1RT4321', driverName: 'Ramesh Kumar', rating: 4.8, phone: '+91 99887 76655', verified: true, company: 'SafeRide Cabs', status: 'Registered' },
            { plate: 'MH01AB1234', driverName: 'Sachin Patil', rating: 4.7, phone: '+91 98989 89898', verified: true, company: 'Metro Cabs', status: 'Registered' },
            { plate: 'KA03EF4567', driverName: 'Anand Murthy', rating: 4.9, phone: '+91 88776 65544', verified: true, company: 'CityTaxi', status: 'Registered' },
            { plate: 'DL1ST9999', driverName: 'Unknown', rating: 0, phone: 'N/A', verified: false, company: 'Unverified operator', status: 'ALERT: Blacklisted / Stolen Vehicle Report Active!' },
            { plate: 'MH02CD7777', driverName: 'Unknown', rating: 1.2, phone: 'N/A', verified: false, company: 'Suspended operator', status: 'ALERT: Unregistered vehicle, suspected tourist scam activity' }
        ];
        this._set('taxis', taxis);

        // Seed nearby emergency services finder data (Feature 8)
        const services = [
            // Delhi Emergency Services
            { id: 'ES001', name: 'Parliament Street Police Station', type: 'police', lat: 28.6210, lng: 77.2100, contact: '112 / 011-23361100' },
            { id: 'ES002', name: 'Connaught Place Police Post', type: 'police', lat: 28.6300, lng: 77.2185, contact: '112 / 011-23412235' },
            { id: 'ES003', name: 'Ram Manohar Lohia Emergency Hospital', type: 'hospital', lat: 28.6253, lng: 77.2025, contact: '102 / 011-23365555' },
            { id: 'ES004', name: 'Apollo Pharmacy Connaught Place', type: 'pharmacy', lat: 28.6320, lng: 77.2195, contact: '011-45607000' },
            { id: 'ES005', name: 'Embassy of the United States', type: 'embacy', lat: 28.5910, lng: 77.1850, contact: '011-24198000' },
            { id: 'ES006', name: 'Consulate General of Japan', type: 'embacy', lat: 28.6015, lng: 77.2155, contact: '011-46108200' },

            // Mumbai Emergency Services
            { id: 'ES101', name: 'Colaba Police Station', type: 'police', lat: 18.9180, lng: 72.8280, contact: '112 / 022-22856817' },
            { id: 'ES102', name: 'King Edward Memorial Hospital', type: 'hospital', lat: 19.0020, lng: 72.8420, contact: '102 / 022-24107000' },
            { id: 'ES103', name: 'Fortis Pharmacy Mumbai Central', type: 'pharmacy', lat: 19.0760, lng: 72.8750, contact: '022-68884000' },
            { id: 'ES104', name: 'French Consulate General Mumbai', type: 'embacy', lat: 19.0620, lng: 72.8310, contact: '022-66694000' },

            // Jaipur Emergency Services
            { id: 'ES201', name: 'Jaipur Kotwali Police', type: 'police', lat: 26.9248, lng: 75.8260, contact: '112' },
            { id: 'ES202', name: 'SMS Government Hospital Emergency', type: 'hospital', lat: 26.8995, lng: 75.8155, contact: '102' },
            { id: 'ES203', name: 'Wellness 24/7 Pharmacy Jaipur', type: 'pharmacy', lat: 26.9124, lng: 75.7873, contact: '0141-2334000' }
        ];
        this._set('emergency_services', services);

        // Seed weather hazard alerts (Feature 17)
        const weatherAlerts = [
            { city: 'Delhi', condition: 'Monsoon Flooding Alert', text: 'Yamuna River flow remains above danger levels. High waterlogging and restricted movements in Yamuna Bank and low areas.', severity: 'medium' },
            { city: 'Mumbai', condition: 'Severe Coastal Gale Alert', text: 'Heavy rainfall and high tides predicted along Juhu Beach & Marine Drive. Tourists warned to stay clear of the beach area tonight.', severity: 'high' },
            { city: 'Jaipur', condition: 'Extreme Heatwave Advisory', text: 'Heat index climbing to 46°C. Avoid outdoor movement between 12:00 PM and 4:00 PM. Drink plenty of water.', severity: 'low' }
        ];
        this._set('weather_alerts', weatherAlerts);

        // Seed Crowded Areas
        const crowded = [
            { name: 'Connaught Place Circle', lat: 28.6304, lng: 77.2177, radius: 400, density: 'High', safetyScore: 88 },
            { name: 'Chandni Chowk Market', lat: 28.6562, lng: 77.2310, radius: 500, density: 'Very High', safetyScore: 52 },
            { name: 'Jaipur Palace Square', lat: 26.9238, lng: 75.8267, radius: 300, density: 'High', safetyScore: 78 }
        ];
        this.saveCrowdedAreas(crowded);

        // Seed Scam Reports
        const scams = [
            { id: 'SC001', title: 'Fake Tour Guide Scam', lat: 28.6430, lng: 77.2130, message: 'Scammers pretending to be official government guides near Paharganj.', reportsCount: 14, phone: '+91 99999 88888' },
            { id: 'SC002', title: 'Overpriced Rickshaw Scam', lat: 28.6562, lng: 77.2310, message: 'Drivers charging 10x the normal price and driving tourists to fake shops.', reportsCount: 22, phone: '+91 98888 77777' },
            { id: 'SC003', title: 'Fake Gemstone Sellers', lat: 26.9238, lng: 75.8267, message: 'Shopkeepers offering fake ruby and emerald stones with false certificates.', reportsCount: 9, phone: '+91 97777 66666' }
        ];
        this.saveScamReports(scams);

        // Seed Trusted Recommendations
        const recs = [
            { name: 'Taj Palace Delhi', type: 'hotel', lat: 28.6139, lng: 77.2090, address: 'Sardar Patel Marg, Diplomatic Enclave', rating: 4.9, certified: true },
            { name: 'Connaught Place Police Booth Cafe', type: 'restaurant', lat: 28.6300, lng: 77.2180, address: 'Radial Road 3, Connaught Place', rating: 4.5, certified: true },
            { name: 'SafeRide Vetted Taxi #102', type: 'taxi', lat: 28.6210, lng: 77.2100, address: 'Parliament Street Stand', rating: 4.8, certified: true }
        ];
        this.saveRecommendations(recs);

        this.markSeeded();
        console.log('[DB] Seed data initialized with Taxi, Services, Weather, Crowds, Scams and Recommendations.');
    },

    // ==================== Crowded Areas ====================
    getCrowdedAreas() { return this._get('crowded_areas'); },
    saveCrowdedAreas(areas) { this._set('crowded_areas', areas); },

    // ==================== Scam Reports ====================
    getScamReports() { return this._get('scam_reports'); },
    saveScamReports(reports) { this._set('scam_reports', reports); },

    // ==================== Trusted Recommendations ====================
    getRecommendations() { return this._get('recommendations'); },
    saveRecommendations(recs) { this._set('recommendations', recs); }
};
