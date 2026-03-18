/**
 * RAS MIRQAB MOBILE V49 - REAL REBUILD
 * Focus: Ultra-Compact Scaling & Robust Data Sync.
 */

const MobileApp = {
    version: 'v49',
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V49: REAL REBUILD START ---');
        
        try {
            this.initNews();
            this.initTV();
            this.initWidgets();
            this.bindEvents();
            this.unlockAudio();
            this.initLayers();
            
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.init();
            }
        } catch (e) {
            console.error('V49 Init Failed:', e);
        }
        
        document.body.classList.add('v49-ready');
    },

    unlockAudio: function() {
        const unlock = () => {
            window.audioUnlocked = true;
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    },

    // ═══ NEWS ENGINE (ULTRA-COMPACT RTL) ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        window.BreakingNewsWidget.renderItems = (container, items) => {
            if (!container) return;
            // Limit to top 15 for extreme performance
            container.innerHTML = items.slice(0, 15).map(item => {
                const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                const time = dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                
                const logo = `../public/logos/${handle}.jpg`;
                let thumb = logo; 
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];

                return `
                    <div class="item-news" onclick="window.open('${item.link}', '_blank')">
                        <div class="n-meta">
                            <img src="${logo}" class="n-logo" onerror="this.src='../public/logos/default.png'">
                            <span class="n-time">${time}</span>
                        </div>
                        <div class="n-text">${item.title}</div>
                        <img src="${thumb}" class="n-thumb" onerror="this.src='../public/logos/default.png'">
                    </div>
                `;
            }).join('');
        };

        window.BreakingNewsWidget.init();
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    // ═══ TV ENGINE (MOBILE COMPACT) ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const channels = [
            { name: 'الجزيرة', id: 'bNyUyrR0PHo' },
            { name: 'العربية', id: 'n7eQejkXbnM' },
            { name: 'الحدث', id: 'xWXpl7azI8k' },
            { name: 'Sky News', id: 'U--OjmpjF5o' },
            { name: 'TRT Arabic', id: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-item" data-ytid="${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.7;">
                <div class="tv-live">LIVE</div>
                <div class="tv-name">${ch.name}</div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-item').forEach(card => {
            card.onclick = () => this.playStream(card);
        });
    },

    playStream: function(card) {
        const id = card.getAttribute('data-ytid');
        const mute = window.audioUnlocked ? 0 : 1;
        
        if (this.activeVideo) {
            const old = this.activeVideo.closest('.tv-item');
            if (old) old.innerHTML = old.dataset.prevHtml;
        }

        card.dataset.prevHtml = card.innerHTML;
        card.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${mute}" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
        this.activeVideo = card.querySelector('iframe');
    },

    initWidgets: function() {
        const clockEl = document.getElementById('widget-clocks');
        if (clockEl) {
            const updateClock = () => {
                const now = new Date();
                const riyadh = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const london = new Date(now.getTime() - 10800000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                clockEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>🇸🇦 الرياض</span> <span style="color:var(--accent)">${riyadh}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>🇬🇧 لندن</span> <span style="color:var(--accent)">${london}</span></div>
                `;
            };
            updateClock();
            setInterval(updateClock, 30000);
        }
    },

    initLayers: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            const isChecked = window.RasMirqabGlobe?.activeLayers?.[key] !== false ? 'checked' : '';
            return `
                <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <input type="checkbox" data-layer="${key}" ${isChecked} style="width:18px; height:18px;">
                    <span style="font-size:12px; font-weight:800;">${cat.emoji} ${cat.labelAr}</span>
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
                wrap.style.flex = '0 0 34dvh';
                bookmark.classList.add('hidden');
            } else {
                wrap.style.flex = '0 0 50px'; // Header only
                bookmark.classList.remove('hidden');
            }
        };

        if (hideBtn) hideBtn.onclick = () => setMapStatus(false);
        if (bookmark) bookmark.onclick = () => setMapStatus(true);

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

        const lBtn = document.getElementById('btn-layers');
        const lModal = document.getElementById('layers-modal');
        if (lBtn) lBtn.onclick = () => { lModal.classList.remove('hidden'); };
        document.getElementById('close-layers').onclick = () => lModal.classList.add('hidden');
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
