/**
 * RAS MIRQAB MOBILE V45 - DASHBOARD RECONSTRUCTION
 * Final Mockup Parity & Data Sync.
 */

const MobileApp = {
    version: 'v45',
    isAudioUnlocked: false,
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V45: DASHBOARD START ---');
        
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }

        this.initNewsSync();
        this.initTVSync();
        this.initWidgets();
        this.bindEvents();
        this.initAudioGuard();
        this.initLayersPanel();
        
        document.body.classList.add('v45-ready');
    },

    initAudioGuard: function() {
        const unlock = () => {
            if (this.isAudioUnlocked) return;
            this.isAudioUnlocked = true;
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
    },

    // ═══ SYNCED NEWS BRAIN ═══
    initNewsSync: function() {
        if (!window.BreakingNewsWidget) return;

        // Override renderItems for V45 Dashboard Style
        window.BreakingNewsWidget.renderItems = (container, items) => {
            if (!container) return;
            // Only show top 15 in the scrollable zone
            container.innerHTML = items.slice(0, 15).map(item => {
                const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                const timeStr = pubDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                
                // Realistic data paths
                const sourceLogo = `../public/logos/${handle}.jpg`;
                let thumb = `../public/logos/${handle}.jpg`; // Fallback
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];

                return `
                    <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                        <div class="ni-meta">
                            <img src="${sourceLogo}" class="ni-source-logo" onerror="this.src='../public/logos/default.png'">
                            <span class="ni-time">${timeStr}</span>
                        </div>
                        <div class="ni-text">${item.title}</div>
                        <img src="${thumb}" class="ni-thumb" onerror="this.src='../public/logos/default.png'">
                    </div>
                `;
            }).join('');
        };

        // Initialize and force a cache sync from the server
        window.BreakingNewsWidget.init();
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    // ═══ SYNCED TV BRAIN ═══
    initTVSync: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        // Take links from Desktop Core (live-tv.js) if available
        let channels = [
            { name: 'الجزيرة', ytId: 'bNyUyrR0PHo' },
            { name: 'العربية', ytId: 'n7eQejkXbnM' },
            { name: 'الحدث', ytId: 'xWXpl7azI8k' },
            { name: 'Sky News', ytId: 'U--OjmpjF5o' },
            { name: 'TRT World', ytId: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-card dashboard-glass" data-ytid="${ch.ytId}">
                <img src="https://img.youtube.com/vi/${ch.ytId}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.8;">
                <div class="tv-label">${ch.name}</div>
                <div style="position:absolute; top:8px; right:8px; width:6px; height:6px; background:#ff4444; border-radius:50%; box-shadow:0 0 5px #f00;"></div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.onclick = () => this.playLive(card);
        });
    },

    playLive: function(card) {
        const ytid = card.getAttribute('data-ytid');
        const mute = this.isAudioUnlocked ? '0' : '1';
        
        // Reset card if needed
        if (this.activeVideo) {
            const oldCard = this.activeVideo.closest('.tv-card');
            if (oldCard) oldCard.innerHTML = oldCard.dataset.oldHtml;
        }

        card.dataset.oldHtml = card.innerHTML;
        card.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytid}?autoplay=1&mute=${mute}" frameborder="0" allow="autoplay" style="width:100%; height:100%;"></iframe>`;
        this.activeVideo = card.querySelector('iframe');
    },

    initWidgets: function() {
        // Clocks Mini
        const clocks = document.getElementById('widget-clocks-mini');
        if (clocks) {
            setInterval(() => {
                const now = new Date();
                clocks.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>🇸🇦 الرياض</span> <span class="w-accent">${now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false})}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>🇬🇧 لندن</span> <span class="w-accent">${new Date(now.getTime() - 3*3600000).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false})}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>🇺🇸 نويورك</span> <span class="w-accent">${new Date(now.getTime() - 8*3600000).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false})}</span></div>
                `;
            }, 1000);
        }
    },

    initLayersPanel: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(k => {
            const c = RasMirqabData.categories[k];
            return `<label class="layer-item"><input type="checkbox" data-layer="${k}" checked> <span style="font-size:12px;">${c.emoji} ${c.labelAr}</span></label>`;
        }).join('');

        list.querySelectorAll('input').forEach(i => {
            i.onchange = (e) => {
                const lid = e.target.dataset.layer;
                if (window.RasMirqabGlobe) {
                    RasMirqabGlobe.activeLayers[lid] = e.target.checked;
                    RasMirqabGlobe.updateGlobeMarkers();
                }
            };
        });
    },

    bindEvents: function() {
        const globe = document.getElementById('globe-section');
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');

        const toggleMap = (show) => {
            if (show === true) {
                globe.style.height = '34vh';
                globe.style.opacity = '1';
                bookmark.classList.add('hidden');
            } else {
                globe.style.height = '0';
                globe.style.opacity = '0';
                bookmark.classList.remove('hidden');
            }
        };

        if (hideBtn) hideBtn.onclick = () => toggleMap(false);
        if (bookmark) bookmark.onclick = () => toggleMap(true);

        const btn2d = document.getElementById('btn-2d');
        const btn3d = document.getElementById('btn-3d');
        if (btn2d && btn3d) {
            btn2d.onclick = () => {
                btn3d.classList.remove('active'); btn2d.classList.add('active');
                if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView('2d');
            };
            btn3d.onclick = () => {
                btn2d.classList.remove('active'); btn3d.classList.add('active');
                if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView('3d');
            };
        }

        const lBtn = document.getElementById('btn-layers');
        const lModal = document.getElementById('layers-modal');
        if (lBtn) lBtn.onclick = () => lModal.classList.remove('hidden');
        document.getElementById('close-layers').onclick = () => lModal.classList.add('hidden');
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
