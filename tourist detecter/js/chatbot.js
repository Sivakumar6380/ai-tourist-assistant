/* ================================================
   SafeTravel AI — Travel Safety Assistant Chatbot
   ================================================ */

const Chatbot = {
    chatHistory: [],

    init() {
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const closeBtn = document.getElementById('chat-close-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const inputEl = document.getElementById('chat-input');
        const quickBtns = document.querySelectorAll('.chat-quick-btn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleWindow());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleWindow(false));
        }
        if (sendBtn && inputEl) {
            sendBtn.addEventListener('click', () => this.sendMessage());
            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        if (quickBtns) {
            quickBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const text = btn.textContent.trim();
                    if (inputEl) {
                        inputEl.value = text;
                        this.sendMessage();
                    }
                });
            });
        }

        // Add greeting message
        this.addBotMessage("Namaste! I am SafeTravel AI, your real-time safety advisor. Ask me anything about local safety, emergency contacts, weather alerts, or nearby police stations!");
    },

    toggleWindow(show = null) {
        const container = document.getElementById('chat-container');
        if (!container) return;

        if (show === true) {
            container.classList.remove('hidden');
        } else if (show === false) {
            container.classList.add('hidden');
        } else {
            container.classList.toggle('hidden');
        }
    },

    sendMessage() {
        const inputEl = document.getElementById('chat-input');
        if (!inputEl) return;
        const text = inputEl.value.trim();
        if (!text) return;

        // Add user message to UI
        this.addUserMessage(text);
        inputEl.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Process message via real Gemini AI API with fallback
        this.generateRealAIResponse(text)
            .then(reply => {
                this.removeTypingIndicator();
                this.addBotMessage(reply);
            })
            .catch(error => {
                console.warn('Gemini API error, falling back to local rule-based engine:', error);
                this.removeTypingIndicator();
                const reply = this.generateResponse(text);
                this.addBotMessage(reply);
            });
    },

    showTypingIndicator() {
        const body = document.getElementById('chat-body');
        if (!body) return;

        const typing = document.createElement('div');
        typing.className = 'chat-message bot';
        typing.id = 'chat-typing-indicator';
        typing.innerHTML = `
            <div class="chat-avatar"><i class="fas fa-robot"></i></div>
            <div class="chat-bubble" style="display: flex; gap: 4px; align-items: center; padding: 10px 14px;">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        body.appendChild(typing);
        body.scrollTop = body.scrollHeight;
    },

    removeTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
    },

    async generateRealAIResponse(query) {
        const apiKey = 'AIzaSyD-ea812x8CERl_gZM9MOjpydm_hF3X-b0';
        const model = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Safely gather live telemetry data
        const tourist = Auth.currentUser;
        let pos = null;
        try { pos = GPS.currentPos; } catch(e) { /* GPS not ready */ }
        const score = window.AIRisk ? (AIRisk.currentScore || 15) : 15;

        let geofences = [], activeAlerts = [], services = [], weather = [];
        try { geofences = DB.getGeofences() || []; } catch(e) {}
        try { activeAlerts = DB.getActiveAlerts() || []; } catch(e) {}
        try { services = DB.getEmergencyServices() || []; } catch(e) {}
        try { weather = DB.getWeatherAlerts() || []; } catch(e) {}

        const systemPrompt = `You are "SafeTravel AI", a real-time, highly personalized proactive travel safety assistant.
You are assisting a tourist named ${tourist?.name || 'Rahul Sharma'} who is currently in India.
Current Tourist Profile & State:
- Nationality: ${tourist?.nationality || 'Indian'}
- Passport: Verified on Blockchain ledger (${tourist?.passport || 'A12345678'})
- Current Hotel: ${tourist?.hotel || 'Taj Palace, Delhi'}
- Current GPS Coordinates: Lat ${pos?.lat || 28.6139}, Lng ${pos?.lng || 77.2090}
- AI Threat Level Score: ${score}/100
- Active Warnings: ${activeAlerts.length > 0 ? activeAlerts.map(a => a.message).join(', ') : 'None'}
- Simulated Geofences Nearby: ${geofences.map(g => `${g.name} (${g.type}, Risk: ${g.riskLevel})`).join('; ')}
- Vetted Emergency Support Services: ${services.map(s => `${s.name} (${s.type}, Contact: ${s.contact})`).join('; ')}
- Active Weather Alerts: ${weather.map(w => `${w.city}: ${w.condition} (${w.text})`).join('; ')}

Instructions:
1. Be extremely concise, empathetic, professional, and action-oriented. Keep responses brief (1-3 paragraphs) as they are viewed in a small floating mobile chatbot interface.
2. Format your response cleanly using markdown bolding, lists, and spacing where necessary.
3. Proactively mention their specific safety details (e.g. nearest police station, geofence warnings) if it relates to their question.
4. If they ask if they are safe, analyze their current safety score (${score}) and any nearby geofences, and give a clear advice.
5. Provide actionable guidance to ensure they are safe at all times.`;

        // Build contents array for the Gemini API.
        // CRITICAL: Gemini requires contents to START with role 'user' and alternate user/model.
        // chatHistory contains the initial bot greeting (role 'bot') which would map to 'model'
        // and cause a 400 error if sent first. We must filter to ensure valid turn structure.
        const recentHistory = this.chatHistory.slice(-8);

        // Skip leading 'bot'/'model' messages so the array starts with 'user'
        let startIdx = 0;
        while (startIdx < recentHistory.length && recentHistory[startIdx].role !== 'user') {
            startIdx++;
        }
        const trimmedHistory = recentHistory.slice(startIdx);

        // Build the contents, ensuring strictly alternating user/model turns
        const contents = [];
        let lastRole = null;
        for (const msg of trimmedHistory) {
            const geminiRole = msg.role === 'user' ? 'user' : 'model';
            // Skip consecutive same-role messages (keep latest)
            if (geminiRole === lastRole) {
                contents[contents.length - 1] = { role: geminiRole, parts: [{ text: msg.content }] };
            } else {
                contents.push({ role: geminiRole, parts: [{ text: msg.content }] });
            }
            lastRole = geminiRole;
        }

        // Safety: if contents is empty or doesn't start with user, build a simple request
        if (contents.length === 0 || contents[0].role !== 'user') {
            contents.length = 0;
            contents.push({ role: 'user', parts: [{ text: query }] });
        }

        console.log('[SafeTravel AI] Sending to Gemini API:', JSON.stringify({ contents, systemInstruction: '...' }).substring(0, 300));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[SafeTravel AI] Gemini API error:', response.status, errBody);
            throw new Error(`Gemini API error ${response.status}: ${errBody.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log('[SafeTravel AI] Gemini API response received:', JSON.stringify(data).substring(0, 300));

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error('[SafeTravel AI] Unexpected response structure:', JSON.stringify(data));
            throw new Error('Invalid API response structure');
        }
    },

    addUserMessage(text) {
        const body = document.getElementById('chat-body');
        if (!body) return;

        const msg = document.createElement('div');
        msg.className = 'chat-message user';
        msg.innerHTML = `<div class="chat-bubble">${text}</div>`;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;

        this.chatHistory.push({ role: 'user', content: text });
    },

    addBotMessage(text) {
        const body = document.getElementById('chat-body');
        if (!body) return;

        const msg = document.createElement('div');
        msg.className = 'chat-message bot';
        
        // Simple markdown parsing for bolding and line breaks to render premium formatted text
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        msg.innerHTML = `
            <div class="chat-avatar"><i class="fas fa-robot"></i></div>
            <div class="chat-bubble">${formattedText}</div>
        `;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;

        this.chatHistory.push({ role: 'bot', content: text });
    },

    generateResponse(query) {
        const text = query.toLowerCase();
        const tourist = Auth.currentUser;
        const pos = GPS.getCurrentCoords();
        const score = window.AIRisk ? AIRisk.currentScore : 15;

        // 1. Check Safety Status / Risk Score
        if (text.includes('safe') || text.includes('risk') || text.includes('danger')) {
            const riskLabel = Utils.riskLabel(score);
            let response = `Your dynamic AI safety risk score is currently **${score}% (${riskLabel} RISK)**. `;
            if (score <= 30) {
                response += `You are in a secure zone with standard parameters. Keep traveling comfortably!`;
            } else if (score <= 65) {
                response += `Caution advised. You are nearing high-crime geofences or evening hours. Avoid unlit lanes.`;
            } else {
                response += `**WARNING! High risk level detected.** Stay in crowded public areas. If you feel unsafe, click the **🆘 SOS** button immediately to call Police & share coordinates.`;
            }
            return response;
        }

        // 2. Nearest Emergency Police Station
        if (text.includes('police') || text.includes('cop') || text.includes('station') || text.includes('help')) {
            if (pos) {
                const services = DB.getEmergencyServices().filter(s => s.type === 'police');
                if (services.length > 0) {
                    // Find closest police station
                    let closest = services[0];
                    let minDist = Utils.haversine(pos.lat, pos.lng, closest.lat, closest.lng);
                    
                    for (let s of services) {
                        const d = Utils.haversine(pos.lat, pos.lng, s.lat, s.lng);
                        if (d < minDist) {
                            minDist = d;
                            closest = s;
                        }
                    }
                    return `The closest Police assistance point is **${closest.name}** (~${(minDist/1000).toFixed(2)} km away).<br>📞 Contact: **${closest.contact}**.<br>I have highlighted the safe route to this station on your Live Map!`;
                }
            }
            return `I recommend contacting the national tourist helpline at **1363** or emergency services at **112** immediately.`;
        }

        // 3. Hospital or Pharmacy
        if (text.includes('hospital') || text.includes('doctor') || text.includes('medical') || text.includes('pharmacy') || text.includes('medicine')) {
            if (pos) {
                const type = text.includes('pharmacy') ? 'pharmacy' : 'hospital';
                const services = DB.getEmergencyServices().filter(s => s.type === type);
                if (services.length > 0) {
                    let closest = services[0];
                    let minDist = Utils.haversine(pos.lat, pos.lng, closest.lat, closest.lng);
                    for (let s of services) {
                        const d = Utils.haversine(pos.lat, pos.lng, s.lat, s.lng);
                        if (d < minDist) {
                            minDist = d;
                            closest = s;
                        }
                    }
                    return `The nearest ${type === 'pharmacy' ? '24/7 Pharmacy' : 'Emergency Hospital'} is **${closest.name}** (~${(minDist/1000).toFixed(2)} km away).<br>📞 Contact: **${closest.contact}**. I've added a navigation marker on your map.`;
                }
            }
            return `For medical emergency, please dial **102** to call an ambulance immediately.`;
        }

        // 4. Taxi Cab / Verification
        if (text.includes('taxi') || text.includes('cab') || text.includes('auto') || text.includes('car') || text.includes('driver')) {
            return `Before entering any cab, use our **Fake Taxi Detection** card on your dashboard! Enter the license plate number (e.g., *DL1RT4321*) or click scan. Our engine cross-references the government registration ledger to prevent common tourist transport scams.`;
        }

        // 5. Weather Advisory
        if (text.includes('weather') || text.includes('rain') || text.includes('flood') || text.includes('heat') || text.includes('storm')) {
            let city = 'Delhi';
            if (pos) {
                if (pos.lat > 18 && pos.lat < 20) city = 'Mumbai';
                else if (pos.lat > 25 && pos.lat < 27) city = 'Jaipur';
            }
            const weather = DB.getWeatherAlerts().find(w => w.city === city);
            if (weather) {
                return `🌦️ **Weather Alert for ${city}**: *${weather.condition}*.<br>${weather.text} (Severity: **${weather.severity.toUpperCase()}**)`;
            }
            return `Weather appears clear in your region. Temperatures are standard for ${city}. Avoid moving outdoors during peak mid-day heat.`;
        }

        // 6. Safe Check-in
        if (text.includes('check-in') || text.includes('timer') || text.includes('countdown')) {
            if (window.CheckIn) {
                return `Your safety check-in countdown timer is currently running. You must click 'Check-In Safe' every few minutes. If it hits zero without checking in, we'll automatically notify your contacts with coordinates!`;
            }
            return `Safe Check-In keeps contacts notified. Make sure to toggle it on.`;
        }

        // 7. Blockchain / Identity Verification
        if (text.includes('blockchain') || text.includes('identity') || text.includes('qr') || text.includes('passport')) {
            return `Your digital identity is completely verified and stored securely using an SHA-256 block ledger. Police can scan the secure QR code on your dashboard to instantly confirm your verified passport status and credentials!`;
        }

        // Fallback safety suggestions
        return `I understand you are asking about safety. Here are 3 quick rules for visiting ${tourist?.nationality || 'India'}:<br>
        1. **Pre-book Taxis**: Avoid drivers offering cheap off-market deals.<br>
        2. **Use Digital ID**: Show your Blockchain QR to verified police officers if requested.<br>
        3. **Live Geofencing**: Keep your map open to get audible geofence warnings near pickpocket regions.`;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to let App load
    setTimeout(() => Chatbot.init(), 100);
});
