/**
 * RAS MIRQAB MOBILE V48 - FRESH GROUND-UP RECONSTRUCTION
 * Focus: Stability, Performance, and Exact Mockup Parity.
 */

const MobileApp = {
    version: 'v48',
    activeVideo: null,
    initialized: false,

    init: function() {
        if (this.initialized) return;
        console.log('--- 🚀 RAS MIRQAB MOBILE V48: FRESH START ---');
        
        try {
            this.initNews();
            this.initTV();
            this.initWidgets();
            this.bindEvents();
            this.unlockAudio();
            this.initLayers();
            
            // Initialize Globe immediately for V48
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.init();
            }
        } catch (e) {
            console.error('Critical Init Failed:', e);
        }
        
        this.initialized = true;
        document.body.classList.add('v48-ready');
    },

    unlockAudio: function() {
        const unlock = () => {
            window.audioUnlocked = true;
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    },

    // ═══ NEWS ENGINE (RTL PARITY) ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        // Custom V48 News Renderer (Logo/Time Left, Text Center, Thumb Right)
        window.BreakingNewsWidget.renderItems = (container, items) => {
            if (!container) return;
            container.innerHTML = items.slice(0, 20).map(item => {
                const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                const time = dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                
                const logo = `../public/logos/${handle}.jpg`;
                let thumb = logo; 
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
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    // ═══ TV ENGINE (LIVE SYNC) ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const channels = [
            { name: 'الجزيرة', id: 'bNyUyrR0PHo' },
            { name: 'العربية', id: 'n7eQejkXbnM' },
            { name: 'الحدث', id: 'xWXpl7azI8k' },
            { name: 'سكاي نيوز', id: 'U--OjmpjF5o' },
            { name: 'TRT عربي', id: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-card" data-ytid="${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.8;">
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
        
        if (this.activeVideo) {
            const old = this.activeVideo.closest('.tv-card');
            if (old) old.innerHTML = old.dataset.prevHtml;
        }

        card.dataset.prevHtml = card.innerHTML;
        card.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${mute}" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
        this.activeVideo = card.querySelector('iframe');
    },

    // ═══ WIDGETS ENGINE (MARKET & CLOCK) ═══
    initWidgets: function() {
        const clockEl = document.getElementById('widget-clocks');
        if (clockEl) {
            const updateClocks = () => {
                const now = new Date();
                const riyadh = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const london = new Date(now.getTime() - 3600000 * 3).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                clockEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>🇸🇦 الرياض</span> <span style="color:var(--accent)">${riyadh}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>🇬🇧 لندن</span> <span style="color:var(--accent)">${london}</span></div>
                `;
            };
            updateClocks();
            setInterval(updateClocks, 10000);
        }
    },

    initLayers: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            const isChecked = window.RasMirqabGlobe?.activeLayers?.[key] !== false ? 'checked' : '';
            return `
                <div class="layer-row">
                    <input type="checkbox" data-layer="${key}" ${isChecked} style="width:22px; height:22px;">
                    <span style="font-size:14px; font-weight:800;">${cat.emoji} ${cat.labelAr}</span>
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

    bindEvents: function() {
        const wrap = document.getElementById('top-third-wrap');
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');

        const setMapStatus = (isVisible) => {
            if (isVisible) {
                wrap.style.height = '35vh';
                bookmark.classList.add('hidden');
                document.getElementById('globe-container').classList.remove('hidden');
            } else {
                wrap.style.height = '65px'; // Collapse to header height
                bookmark.classList.remove('hidden');
                document.getElementById('globe-container').classList.add('hidden');
            }
        };

        if (hideBtn) hideBtn.onclick = () => setMapStatus(false);
        if (bookmark) bookmark.onclick = () => setMapStatus(true);

        // 2D/3D Toggles
        const btns = { "2d": document.getElementById('btn-2d'), "3d": document.getElementById('btn-3d') };
        Object.keys(btns).forEach(mode => {
            if (btns[mode]) {
                btns[mode].onclick = () => {
                    Object.values(btns).forEach(b => b.classList.remove('active'));
                    btns[mode].classList.add('active');
                    if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView(mode);
                };
            }
        });

        // Modal Controls
        const lBtn = document.getElementById('btn-layers');
        const lModal = document.getElementById('layers-modal');
        if (lBtn) lBtn.onclick = () => lModal.classList.remove('hidden');
        document.getElementById('close-layers').onclick = () => lModal.classList.add('hidden');
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
