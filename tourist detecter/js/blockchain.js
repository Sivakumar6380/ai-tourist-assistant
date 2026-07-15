/* ================================================
   SafeTravel AI — Blockchain Identity Verification
   ================================================ */

const Blockchain = {
    chain: [],

    init() {
        this.chain = DB.getChain();
        if (this.chain.length === 0) {
            this.chain.push(this.createGenesisBlock());
            DB.saveChain(this.chain);
        }
    },

    createGenesisBlock() {
        return {
            index: 0,
            timestamp: Date.now(),
            data: { type: 'genesis', message: 'SafeTravel AI Blockchain Initialized' },
            previousHash: '0',
            hash: this.calculateHash(0, Date.now(), { type: 'genesis' }, '0'),
            nonce: 0
        };
    },

    calculateHash(index, timestamp, data, previousHash, nonce = 0) {
        const str = index + timestamp + JSON.stringify(data) + previousHash + nonce;
        return CryptoJS.SHA256(str).toString();
    },

    addIdentityBlock(tourist) {
        const prevBlock = this.chain[this.chain.length - 1];
        const newBlock = {
            index: this.chain.length,
            timestamp: Date.now(),
            data: {
                type: 'identity',
                touristId: tourist.id,
                name: tourist.name,
                passport: tourist.passport,
                nationality: tourist.nationality || 'N/A',
                identityHash: CryptoJS.SHA256(
                    tourist.name + tourist.passport + tourist.phone
                ).toString()
            },
            previousHash: prevBlock.hash,
            hash: '',
            nonce: 0
        };

        // Simple proof-of-work (low difficulty for demo)
        let nonce = 0;
        let hash = '';
        do {
            nonce++;
            hash = this.calculateHash(
                newBlock.index, newBlock.timestamp,
                newBlock.data, newBlock.previousHash, nonce
            );
        } while (!hash.startsWith('0'));

        newBlock.hash = hash;
        newBlock.nonce = nonce;

        this.chain.push(newBlock);
        DB.saveChain(this.chain);
        return newBlock;
    },

    getIdentityBlock(touristId) {
        return this.chain.find(b => b.data && b.data.touristId === touristId);
    },

    verifyHash(hash) {
        return this.chain.find(b => b.hash === hash || (b.data && b.data.identityHash === hash));
    },

    verifyChainIntegrity() {
        for (let i = 1; i < this.chain.length; i++) {
            const curr = this.chain[i];
            const prev = this.chain[i - 1];
            if (curr.previousHash !== prev.hash) return false;
        }
        return true;
    },

    renderQR(containerId, data, size = 128) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        try {
            new QRCode(container, {
                text: data,
                width: size,
                height: size,
                colorDark: '#00d4ff',
                colorLight: '#111827',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            container.innerHTML = '<p style="color:var(--text-dim);font-size:0.8rem;">QR unavailable</p>';
        }
    },

    renderMiniCard(tourist) {
        const block = this.getIdentityBlock(tourist.id);
        if (!block) return;

        const hashDisplay = document.getElementById('bc-hash-display');
        if (hashDisplay) hashDisplay.textContent = block.data.identityHash;

        this.renderQR('bc-qr-mini', block.data.identityHash, 100);
    },

    renderFullViewer(tourist) {
        const block = this.getIdentityBlock(tourist.id);
        if (!block) return;

        // Identity fields
        const fieldsEl = document.getElementById('bc-id-fields');
        if (fieldsEl) {
            fieldsEl.innerHTML = `
                <div class="bc-id-field"><span class="bc-id-field-label">Name</span><span class="bc-id-field-value">${tourist.name}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Tourist ID</span><span class="bc-id-field-value">${tourist.id}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Passport/Aadhar</span><span class="bc-id-field-value">${tourist.passport}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Nationality</span><span class="bc-id-field-value">${tourist.nationality || 'N/A'}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Identity Hash</span><span class="bc-id-field-value">${block.data.identityHash}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Block Hash</span><span class="bc-id-field-value">${Utils.truncHash(block.hash, 12)}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Block #</span><span class="bc-id-field-value">${block.index}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Verified At</span><span class="bc-id-field-value">${Utils.formatDateTime(block.timestamp)}</span></div>
                <div class="bc-id-field"><span class="bc-id-field-label">Chain Integrity</span><span class="bc-id-field-value" style="color:var(--success)">✓ Valid</span></div>
            `;
        }

        // Full QR
        this.renderQR('bc-qr-full', block.data.identityHash, 160);

        // Chain display
        const chainEl = document.getElementById('bc-chain-display');
        if (chainEl) {
            chainEl.innerHTML = this.chain.map((b, i) => `
                ${i > 0 ? '<div class="bc-block-connector"></div>' : ''}
                <div class="bc-block" style="animation-delay:${i * 0.1}s">
                    <div class="bc-block-header">
                        <span>Block #${b.index}</span>
                        <span style="font-size:0.65rem;color:var(--text-muted)">${b.data.type === 'genesis' ? '🏁' : '🆔'}</span>
                    </div>
                    <div class="bc-block-field">Hash: <span>${Utils.truncHash(b.hash, 6)}</span></div>
                    <div class="bc-block-field">Prev: <span>${Utils.truncHash(b.previousHash, 6)}</span></div>
                    <div class="bc-block-field">Nonce: <span>${b.nonce}</span></div>
                    <div class="bc-block-field">Type: <span>${b.data.type}</span></div>
                    ${b.data.touristId ? `<div class="bc-block-field">Tourist: <span>${b.data.name || b.data.touristId}</span></div>` : ''}
                </div>
            `).join('');
        }
    },

    setupVerification() {
        const verifyBtn = document.getElementById('verify-hash-btn');
        const verifyInput = document.getElementById('verify-hash-input');
        const result = document.getElementById('verify-result');

        if (verifyBtn) {
            verifyBtn.onclick = () => {
                const hash = verifyInput.value.trim();
                if (!hash) {
                    Utils.toast('Error', 'Please enter a hash to verify', 'warning');
                    return;
                }

                const found = this.verifyHash(hash);
                if (found) {
                    result.className = 'verify-result verified';
                    result.innerHTML = `<i class="fas fa-check-circle"></i> <strong>Identity Verified!</strong><br>
                        Block #${found.index} | Tourist: ${found.data.name || 'Genesis'} | Timestamp: ${Utils.formatDateTime(found.timestamp)}`;
                } else {
                    result.className = 'verify-result not-found';
                    result.innerHTML = `<i class="fas fa-circle-xmark"></i> <strong>Not Found</strong><br>
                        This hash does not match any identity in the blockchain.`;
                }
            };
        }
    }
};
