/* ================================================
   SafeTravel AI — Multi-Language Support Engine
   ================================================ */

const Translations = {
    currentLang: 'en',

    dictionary: {
        en: {
            dashboard: "Dashboard",
            blockchainId: "Blockchain ID",
            commandCenter: "Command Center",
            riskLevel: "Risk Level",
            gpsStatus: "GPS Status",
            digitalIdentity: "Digital Identity",
            geofence: "Geo-Fence",
            myLiveLocation: "My Live Location",
            updatePosition: "Update Position",
            address: "Address",
            latitude: "Latitude",
            longitude: "Longitude",
            accuracy: "Accuracy",
            liveTracking: "Live Location Tracking",
            center: "Center",
            zones: "Zones",
            aiRisk: "AI Risk Assessment",
            viewFull: "View Full Chain",
            recentAlerts: "Recent Alerts",
            noAlerts: "No alerts — You're safe!",
            safeZone: "Safe Zone",
            low: "LOW",
            medium: "MEDIUM",
            high: "HIGH",
            holdSos: "Hold for 3 seconds to activate SOS",
            faceLogin: "Facial Biometrics Login",
            verifyTaxi: "Fake Taxi Detection",
            checkIn: "Safe Check-In System",
            wearable: "FitSync Smart Wearable",
            chatTitle: "AI Travel Assistant",
            nearestServices: "Nearby Emergency Services",
            safestRoute: "Safest Route (AI)",
            shortestRoute: "Shortest Route",
            onlineSMS: "Offline SMS Alert",
            simulateShake: "Simulate Shake",
            simulateFall: "Simulate Fall",
            simulateInactivity: "Simulate Inactivity",
            verifyBtn: "Verify",
            checkInBtn: "Check-In Safe"
        },
        ta: {
            dashboard: "டாஷ்போர்டு",
            blockchainId: "பிளாக்செயின் ஐடி",
            commandCenter: "கட்டளை மையம்",
            riskLevel: "ஆபத்து நிலை",
            gpsStatus: "ஜிபிஎஸ் நிலை",
            digitalIdentity: "டிஜிட்டல் அடையாளம்",
            geofence: "புவி-வேலி",
            myLiveLocation: "எனது நேரடி இருப்பிடம்",
            updatePosition: "இருப்பிடத்தைப் புதுப்பி",
            address: "முகவரி",
            latitude: "அட்சரேகை",
            longitude: "தீர்க்கரேகை",
            accuracy: "துல்லியம்",
            liveTracking: "நேரடி இருப்பிட கண்காணிப்பு",
            center: "மையப்படுத்து",
            zones: "மண்டலங்கள்",
            aiRisk: "AI ஆபத்து மதிப்பீடு",
            viewFull: "முழு சங்கிலியைப் பார்",
            recentAlerts: "சமீபத்திய விழிப்பூட்டல்கள்",
            noAlerts: "விழிப்பூட்டல்கள் இல்லை — நீங்கள் பாதுகாப்பாக இருக்கிறீர்கள்!",
            safeZone: "பாதுகாப்பான மண்டலம்",
            low: "குறைந்த",
            medium: "நடுத்தர",
            high: "அதிக",
            holdSos: "SOS ஐ செயல்படுத்த 3 விநாடிகள் அழுத்தி பிடிக்கவும்",
            faceLogin: "முக அங்கீகார உள்நுழைவு",
            verifyTaxi: "போலி டாக்ஸி கண்டறிதல்",
            checkIn: "பாதுகாப்பான செக்-இன்",
            wearable: "ஃபிட்சின்க் அணியக்கூடிய சாதனம்",
            chatTitle: "AI பயண உதவியாளர்",
            nearestServices: "அருகிலுள்ள அவசர சேவைகள்",
            safestRoute: "பாதுகாப்பான பாதை (AI)",
            shortestRoute: "குறுகிய பாதை",
            onlineSMS: "ஆஃப்லைன் எஸ்எம்எஸ் விழிப்பூட்டல்",
            simulateShake: "அதிர்வை உருவகப்படுத்து",
            simulateFall: "வீழ்ச்சியை உருவகப்படுத்து",
            simulateInactivity: "செயலற்ற தன்மையை உருவகப்படுத்து",
            verifyBtn: "சரிபார்",
            checkInBtn: "பாதுகாப்பான செக்-இன்"
        },
        hi: {
            dashboard: "डैशबोर्ड",
            blockchainId: "ब्लॉकचेन आईडी",
            commandCenter: "कमांड सेंटर",
            riskLevel: "जोखिम स्तर",
            gpsStatus: "जीपीएस स्थिति",
            digitalIdentity: "डिजिटल पहचान",
            geofence: "जियो-फेंस",
            myLiveLocation: "मेरी लाइव लोकेशन",
            updatePosition: "स्थिति अपडेट करें",
            address: "पता",
            latitude: "अक्षांश",
            longitude: "देशांतर",
            accuracy: "सटीकता",
            liveTracking: "लाइव लोकेशन ट्रैकिंग",
            center: "केंद्रित करें",
            zones: "जोन",
            aiRisk: "एआई जोखिम मूल्यांकन",
            viewFull: "पूरी चेन देखें",
            recentAlerts: "हालिया अलर्ट",
            noAlerts: "कोई अलर्ट नहीं — आप सुरक्षित हैं!",
            safeZone: "सुरक्षित क्षेत्र",
            low: "कम",
            medium: "मध्यम",
            high: "उच्च",
            holdSos: "एसओएस सक्रिय करने के लिए 3 सेकंड दबाए रखें",
            faceLogin: "चेहरा बायोमेट्रिक लॉगिन",
            verifyTaxi: "फर्जी टैक्सी पहचान",
            checkIn: "सुरक्षित चेक-इन सिस्टम",
            wearable: "फिटसिंक स्मार्ट वियरेबल",
            chatTitle: "एआई यात्रा सहायक",
            nearestServices: "निकटतम आपातकालीन सेवाएं",
            safestRoute: "सबसे सुरक्षित मार्ग (AI)",
            shortestRoute: "सबसे छोटा मार्ग",
            onlineSMS: "ऑफ़लाइन एसएमएस अलर्ट",
            simulateShake: "शेक अनुकरण",
            simulateFall: "गिरावट अनुकरण",
            simulateInactivity: "निष्क्रियता अनुकरण",
            verifyBtn: "सत्यापित करें",
            checkInBtn: "सुरक्षित चेक-इन"
        },
        fr: {
            dashboard: "Tableau de Bord",
            blockchainId: "ID Blockchain",
            commandCenter: "Centre de Commandement",
            riskLevel: "Niveau de Risque",
            gpsStatus: "Statut GPS",
            digitalIdentity: "Identité Numérique",
            geofence: "Géo-barrière",
            myLiveLocation: "Ma Position en Direct",
            updatePosition: "Mettre à jour la Position",
            address: "Adresse",
            latitude: "Latitude",
            longitude: "Longitude",
            accuracy: "Précision",
            liveTracking: "Suivi de Position en Direct",
            center: "Centrer",
            zones: "Zones",
            aiRisk: "Évaluation des Risques IA",
            viewFull: "Voir la Chaîne Complète",
            recentAlerts: "Alertes Récentes",
            noAlerts: "Aucune alerte — Vous êtes en sécurité !",
            safeZone: "Zone Sécurisée",
            low: "FAIBLE",
            medium: "MOYEN",
            high: "ÉLEVÉ",
            holdSos: "Maintenir 3 secondes pour activer l'SOS",
            faceLogin: "Connexion Faciale Biométrique",
            verifyTaxi: "Détection de Faux Taxi",
            checkIn: "Système d'Enregistrement",
            wearable: "Montre Connectée FitSync",
            chatTitle: "Assistant de Voyage IA",
            nearestServices: "Services d'Urgence Proches",
            safestRoute: "Route la plus Sûre (IA)",
            shortestRoute: "Route la plus Courte",
            onlineSMS: "Alerte SMS Hors-ligne",
            simulateShake: "Simuler Secousse",
            simulateFall: "Simuler Chute",
            simulateInactivity: "Simuler Inactivité",
            verifyBtn: "Vérifier",
            checkInBtn: "Enregistrement Sûr"
        },
        ja: {
            dashboard: "ダッシュボード",
            blockchainId: "ブロックチェーンID",
            commandCenter: "司令センター",
            riskLevel: "リスクレベル",
            gpsStatus: "GPSステータス",
            digitalIdentity: "デジタル身分証明",
            geofence: "ジオフェンス",
            myLiveLocation: "ライブ位置情報",
            updatePosition: "位置を更新",
            address: "住所",
            latitude: "緯度",
            longitude: "経度",
            accuracy: "精度",
            liveTracking: "ライブ位置追跡",
            center: "センター",
            zones: "ゾーン",
            aiRisk: "AIリスク評価",
            viewFull: "チェーンを表示",
            recentAlerts: "最近のアラート",
            noAlerts: "アラートなし — 安全です！",
            safeZone: "安全ゾーン",
            low: "低",
            medium: "中",
            high: "高",
            holdSos: "SOS起動には3秒間長押し",
            faceLogin: "顔認証ログイン",
            verifyTaxi: "偽タクシー検出",
            checkIn: "安全チェックイン",
            wearable: "FitSyncスマートウェアラブル",
            chatTitle: "AI旅行アシスタント",
            nearestServices: "近くの緊急サービス",
            safestRoute: "最も安全なルート (AI)",
            shortestRoute: "最短ルート",
            onlineSMS: "オフラインSMSアラート",
            simulateShake: "シェイクをシミュレート",
            simulateFall: "落下をシミュレート",
            simulateInactivity: "無活動をシミュレート",
            verifyBtn: "認証",
            checkInBtn: "安全チェックイン"
        }
    },

    init() {
        const stored = localStorage.getItem('st_lang');
        if (stored && this.dictionary[stored]) {
            this.currentLang = stored;
        }
        this.applyTranslations();
    },

    setLanguage(lang) {
        if (this.dictionary[lang]) {
            this.currentLang = lang;
            localStorage.setItem('st_lang', lang);
            this.applyTranslations();
            Utils.toast('Language Changed', `UI updated to ${lang.toUpperCase()}`, 'success');
        }
    },

    applyTranslations() {
        const dict = this.dictionary[this.currentLang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'INPUT' && el.placeholder) {
                    el.placeholder = dict[key];
                } else {
                    el.innerHTML = dict[key];
                }
            }
        });
    }
};

// Global translation accessor
window.addEventListener('DOMContentLoaded', () => Translations.init());
