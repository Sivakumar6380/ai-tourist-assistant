/* ================================================
   SafeTravel AI — Utility Functions
   ================================================ */

const Utils = {
    // Generate a unique ID
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Format timestamp
    formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    },

    formatDateTime(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    },

    formatDateShort(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    },

    // Time ago
    timeAgo(ts) {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    },

    // Haversine distance in meters
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // Random number between min and max
    rand(min, max) {
        return Math.random() * (max - min) + min;
    },

    randInt(min, max) {
        return Math.floor(this.rand(min, max + 1));
    },

    // Pick random from array
    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // Clamp value
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Truncate hash for display
    truncHash(hash, len = 8) {
        if (!hash) return '';
        return hash.substr(0, len) + '...' + hash.substr(-len);
    },

    // Show toast notification
    toast(title, message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            danger: 'fa-circle-xmark',
            info: 'fa-circle-info'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-xmark"></i></button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Debounce
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    // Get risk class
    riskClass(score) {
        if (score <= 30) return 'low';
        if (score <= 65) return 'medium';
        return 'high';
    },

    riskLabel(score) {
        if (score <= 30) return 'LOW';
        if (score <= 65) return 'MEDIUM';
        return 'HIGH';
    },

    riskColor(score) {
        if (score <= 30) return '#00ff88';
        if (score <= 65) return '#ffaa00';
        return '#ff3366';
    }
};
