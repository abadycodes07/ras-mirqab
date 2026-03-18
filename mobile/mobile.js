/**
 * RAS MIRQAB MOBILE V52 - ULTIMATE GLASS OVERHAUL
 */

const MobileApp = {
    version: 'v52',
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V52: ULTIMATE GLASS OVERHAUL START ---');
        
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
            console.error('V52 Init Failed:', e);
        }
    },

    unlockAudio: function() {
        const unlock = () => {
            window.audioUnlocked = true;
            document.removeEventListener('click', unlock);
            if (this.activeVideo) this.activeVideo.muted = false;
        };
        document.addEventListener('click', unlock);
    },

    // ═══ NEWS ENGINE (V52 MEDIA FIX) ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        window.BreakingNewsWidget.renderOverride = (container, items) => {
            if (!container) return;
            
            // Critical: Use paths relative to ROOT for images to avoid /mobile/ context issues
            const ROOT = window.location.origin + window.location.pathname.split('/mobile')[0];
            
            container.innerHTML = items.slice(0, 20).map(item => {
                const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                const time = dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                const source = item.source || 'rss';
                
                // V52: High-fidelity image resolution
                const logo = `${ROOT}/public/logos/${handle}.jpg`;
                const fallbackLogo = `${ROOT}/public/logos/default.png`;
                
                let thumb = null;
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];
                
                const platformColor = source === 'telegram' ? '#0088cc' : '#ff701a';
                const platformIcon = source === 'telegram' ? 'T' : '𝕏';

                return `
                    <div class="item-news" onclick="window.open('${item.link}', '_blank')">
                        <div class="n-meta">
                            <div class="n-logo-wrap">
                                <img src="${logo}" class="n-logo" onerror="this.src='${fallbackLogo}'">
                                <div class="n-badge" style="background:${platformColor}">${platformIcon}</div>
                            </div>
                            <span class="n-time">${time}</span>
                        </div>
                        <div class="n-text">${item.title}</div>
                        ${thumb ? `<img src="${thumb}" class="n-thumb" onerror="this.style.display='none'">` : ''}
                    </div>
                `;
            }).join('');
        };

        window.BreakingNewsWidget.init();
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    // ═══ TV ENGINE (V52 AUTOPLAY) ═══
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

        carousel.innerHTML = channels.map((ch, idx) => `
            <div class="tv-item ${idx === 0 ? 'active' : ''}" data-ytid="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.6;">
                <div class="tv-live">LIVE</div>
                <div class="tv-name">${ch.name}</div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-item').forEach(card => {
            card.onclick = () => this.playStream(card);
        });

        // Autoplay Al Jazeera after small delay
        setTimeout(() => {
            const alj = carousel.querySelector('.tv-item');
            if (alj) this.playStream(alj);
        }, 1500);
    },

    playStream: function(card) {
        const id = card.getAttribute('data-ytid');
        const mute = window.audioUnlocked ? 0 : 1;
        
        document.querySelectorAll('.tv-item').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

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
                const ryd = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' });
                const ldn = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
                clockEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>🇸🇦 الرياض</span> <span style="color:var(--lux-gold); font-family:Orbitron;">${ryd}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>🇬🇧 لندن</span> <span style="color:var(--lux-gold); font-family:Orbitron;">${ldn}</span></div>
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
                <div style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <input type="checkbox" data-layer="${key}" ${isChecked} style="width:18px; height:18px; accent-color:var(--lux-gold);">
                    <span style="font-size:13px; font-weight:800;">${cat.emoji} ${cat.labelAr}</span>
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
        const syncLaunch = document.getElementById('hard-sync-launch');

        if (syncLaunch) {
            syncLaunch.onclick = () => window.location.reload(true);
        }

        const setMapStatus = (isVisible) => {
            if (isVisible) {
                wrap.style.flex = '0 0 34vh';
                bookmark.classList.add('hidden');
            } else {
                wrap.style.height = '60px'; 
                wrap.style.flex = '0 0 60px';
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
p = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
