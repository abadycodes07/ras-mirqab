/**
 * RAS MIRQAB MOBILE V46 - ULTRA-FIDELITY DASHBOARD
 */

const MobileApp = {
    version: 'v47',
    landingMode: true,
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V47: DASHBOARD START ---');
        
        try {
            this.initLanding();
        } catch (e) {
            console.error('Landing Init Failed:', e);
        }
        
        try {
            this.initNews();
            this.initTV();
            this.initWidgets();
            this.bindEvents();
            this.unlockAudio();
            this.initLayers();
        } catch (e) {
            console.error('Core Components Failed:', e);
        }
        
        // Delay globe for performance if in landing mode
        if (!this.landingMode && window.RasMirqabGlobe) {
            try { RasMirqabGlobe.init(); } catch(e) {}
        }
        
        document.body.classList.add('v47-ready');
    },

    unlockAudio: function() {
        const unlock = () => {
            window.audioUnlocked = true;
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    },

    // ═══ DATA BRAIN: NEWS ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        // Custom V46 News Renderer (Thumb on Right, Logo on Left)
        window.BreakingNewsWidget.renderItems = (container, items) => {
            if (!container) return;
            // Limit to 15 items for top-tier performance
            container.innerHTML = items.slice(0, 15).map(item => {
                const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                const time = dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                
                // Construct high-fidelity paths
                const logo = `../public/logos/${handle}.jpg`;
                let thumb = logo; // Fallback
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];

                return `
                    <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                        <div class="ni-meta">
                            <img src="${logo}" class="ni-source-logo" onerror="this.src='../public/logos/default.png'">
                            <span class="ni-time">${time}</span>
                        </div>
                        <div class="ni-text">${item.title}</div>
                        <img src="${thumb}" class="ni-thumb" onerror="this.src='../public/logos/default.png'">
                    </div>
                `;
            }).join('');
        };

        window.BreakingNewsWidget.init();
        // Force refresh from server cache to avoid old data
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    // ═══ DATA BRAIN: TV ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        // High-Fidelity Channel Sync from Desktop logic
        const channels = [
            { name: 'Al Jazeera', id: 'bNyUyrR0PHo' },
            { name: 'Al Arabiya', id: 'n7eQejkXbnM' },
            { name: 'Al Hadath', id: 'xWXpl7azI8k' },
            { name: 'Sky News AD', id: 'U--OjmpjF5o' },
            { name: 'TRT World', id: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-card glass-btn" data-ytid="${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.7;">
                <div class="tv-live-tag">LIVE</div>
                <div class="tv-label">${ch.name}</div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.onclick = () => this.playStream(card);
        });
    },

    playStream: function(card) {
        const id = card.getAttribute('data-ytid');
        const mute = window.audioUnlocked ? 0 : 1;
        
        // Modal or In-place? In-place for dashboard feel
        if (this.activeVideo) {
            const old = this.activeVideo.closest('.tv-card');
            if (old) old.innerHTML = old.dataset.prevHtml;
        }

        card.dataset.prevHtml = card.innerHTML;
        card.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${mute}" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
        this.activeVideo = card.querySelector('iframe');
    },

    initWidgets: function() {
        // Simple Clock Mini
        const clockEl = document.getElementById('widget-clocks');
        if (clockEl) {
            setInterval(() => {
                const riyadh = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const london = new Date(new Date().getTime() - 3600000 * 3).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                clockEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>🇸🇦 Riyadh</span> <span style="color:var(--accent)">${riyadh}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>🇬🇧 London</span> <span style="color:var(--accent)">${london}</span></div>
                `;
            }, 1000);
        }
    },

    initLayers: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            const isChecked = window.RasMirqabGlobe?.activeLayers[key] !== false ? 'checked' : '';
            return `
                <div class="layer-row">
                    <input type="checkbox" data-layer="${key}" ${isChecked} style="width:18px; height:18px;">
                    <span style="font-size:13px; font-weight:700;">${cat.emoji} ${cat.labelAr}</span>
                </div>
            `;
        }).join('');

        list.querySelectorAll('input').forEach(box => {
            box.onchange = (e) => {
                const lid = e.target.dataset.layer;
                if (window.RasMirqabGlobe) {
                    RasMirqabGlobe.activeLayers[lid] = e.target.checked;
                    RasMirqabGlobe.updateGlobeMarkers();
                }
            };
        });
    },

    initLanding: function() {
        const enterBtn = document.getElementById('btn-enter-dash');
        const landing = document.getElementById('luxury-landing');
        const dash = document.getElementById('main-dashboard');

        if (enterBtn) {
            enterBtn.onclick = () => {
                landing.classList.add('hidden');
                dash.classList.add('active');
                document.body.classList.remove('landing-active');
                this.landingMode = false;
                
                // Init globe now
                if (window.RasMirqabGlobe) {
                    RasMirqabGlobe.init();
                }
            };
        }
    },

    bindEvents: function() {
        const wrap = document.getElementById('top-third-wrap');
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');

        const setMapStatus = (isVisible) => {
            if (isVisible) {
                wrap.style.height = '35vh';
                wrap.style.opacity = '1';
                bookmark.classList.add('hidden');
                document.getElementById('globe-container').classList.remove('hidden');
            } else {
                wrap.style.height = '0';
                wrap.style.opacity = '0.99'; // Stay slightly active but height 0 hides the globe
                bookmark.classList.remove('hidden');
                document.getElementById('globe-container').classList.add('hidden');
            }
        };

        if (hideBtn) hideBtn.onclick = () => setMapStatus(false);
        if (bookmark) bookmark.onclick = () => setMapStatus(true);

        // 2D/3D Toggles
        const btns = { 
            "2d": document.getElementById('btn-2d'), 
            "3d": document.getElementById('btn-3d') 
        };
        Object.keys(btns).forEach(mode => {
            if (btns[mode]) {
                btns[mode].onclick = () => {
                    Object.values(btns).forEach(b => b.classList.remove('active'));
                    btns[mode].classList.add('active');
                    if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView(mode);
                };
            }
        });

        // Modals
        const lBtn = document.getElementById('btn-layers');
        const lModal = document.getElementById('layers-modal');
        if (lBtn) lBtn.onclick = () => lModal.classList.remove('hidden');
        document.getElementById('close-layers').onclick = () => lModal.classList.add('hidden');
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
