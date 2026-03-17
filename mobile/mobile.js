/**
 * RAS MIRQAB MOBILE V44 - PREMIUM FULL-STACK OVERHAUL
 * Objective: High-Fidelity UI, PiP Video, and RTL Parity.
 */

const MobileApp = {
    version: 'v44',
    isAudioUnlocked: false,
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V44: PREMIUM OVERHAUL ---');
        
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }

        this.initNews();
        this.initTV();
        this.initWidgets();
        this.bindEvents();
        this.initAudioGuard();
        this.initLayersPanel();
        this.initPiP();
        
        document.body.classList.add('v44-ready');
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

    // ═══ NEWS MODULE (V44 RTL PARITY) ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        window.BreakingNewsWidget.renderItems = (items) => {
            const container = document.getElementById('breaking-news-body');
            if (!container) return;

            container.innerHTML = items.slice(0, 10).map(item => {
                const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                const timeStr = pubDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                const sourceLogo = `../public/logos/${handle}.jpg`;
                
                let thumb = '../public/logos/default.png';
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];

                return `
                    <div class="news-item glass-item-interactive" onclick="window.open('${item.link}', '_blank')">
                        <img src="${thumb}" class="ni-thumb" onerror="this.src='../public/logos/default.png'">
                        <div class="ni-text">${item.title}</div>
                        <div class="ni-right-stack">
                            <img src="${sourceLogo}" class="ni-source-logo" onerror="this.src='../public/logos/default.png'">
                            <span class="ni-time">${timeStr}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        window.BreakingNewsWidget.init();
    },

    // ═══ TV & PiP LOGIC ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const channels = [
            { name: 'الجزيرة', ytId: 'bNyUCPTvalg' },
            { name: 'العربية', ytId: '-PjD_X_8x6E' },
            { name: 'الحدث', ytId: 'f0Xunf9Okp8' },
            { name: 'Sky News', ytId: '9vMsh_Lz51Y' },
            { name: 'TRT World', ytId: 'yAt3L89U6pA' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-card glass-item-interactive" data-ytid="${ch.ytId}">
                <div class="tv-live-badge">LIVE</div>
                <img src="https://img.youtube.com/vi/${ch.ytId}/mqdefault.jpg" class="tv-thumb" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; bottom:5px; left:0; right:0; text-align:center; font-size:10px; font-weight:800; background:rgba(0,0,0,0.4);">${ch.name}</div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.onclick = () => this.playInCard(card);
        });
    },

    playInCard: function(card) {
        const ytid = card.getAttribute('data-ytid');
        const muteState = this.isAudioUnlocked ? '0' : '1';
        
        // Clear previous
        if (this.activeVideo && this.activeVideo.parentNode) {
            const oldCard = this.activeVideo.closest('.tv-card');
            if (oldCard) {
                const originalHtml = oldCard.getAttribute('data-original-html');
                if (originalHtml) oldCard.innerHTML = originalHtml;
            }
        }

        if (!card.hasAttribute('data-original-html')) {
            card.setAttribute('data-original-html', card.innerHTML);
        }
        
        card.innerHTML = `<iframe id="active-live-video" src="https://www.youtube.com/embed/${ytid}?autoplay=1&mute=${muteState}&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%;"></iframe>`;
        
        this.activeVideo = document.getElementById('active-live-video');
    },

    initPiP: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!this.activeVideo) return;
                
                if (!entry.isIntersecting) {
                    this.activeVideo.classList.add('floating-pip-mode');
                    document.body.appendChild(this.activeVideo);
                } else {
                    this.activeVideo.classList.remove('floating-pip-mode');
                    // Find the original card to return the video to
                    const ytid = new URL(this.activeVideo.src).pathname.split('/').pop();
                    const targetCard = document.querySelector(`.tv-card[data-ytid="${ytid}"]`);
                    if (targetCard) targetCard.appendChild(this.activeVideo);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(carousel);
    },

    // ═══ WIDGETS ═══
    initWidgets: function() {
        const clocksEl = document.getElementById('widget-clocks-list');
        if (clocksEl) {
            const cities = [
                { n: 'London', f: '🇬🇧' },
                { n: 'NYC', f: '🇺🇸' },
                { n: 'Riyadh', f: '🇸🇦' }
            ];
            setInterval(() => {
                clocksEl.innerHTML = cities.map(c => {
                    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    return `<div style="display:flex; justify-content:space-between;"><span>${c.f} ${c.n}</span> <span style="color:var(--accent)">${time}</span></div>`;
                }).join('');
            }, 1000);
        }
    },

    initLayersPanel: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData || !RasMirqabData.categories) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            return `
                <label class="layer-item">
                    <input type="checkbox" data-layer="${key}" ${cat.default !== false ? 'checked' : ''}>
                    <span style="font-size:12px;">${cat.emoji} ${cat.labelAr}</span>
                </label>
            `;
        }).join('');

        list.querySelectorAll('input').forEach(input => {
            input.onchange = (e) => {
                const lid = e.target.getAttribute('data-layer');
                if (window.RasMirqabGlobe && window.RasMirqabGlobe.activeLayers) {
                    window.RasMirqabGlobe.activeLayers[lid] = e.target.checked;
                    if (window.RasMirqabGlobe.updateGlobeMarkers) window.RasMirqabGlobe.updateGlobeMarkers();
                    if (window.RasMirqabGlobe.updateMapMarkers) window.RasMirqabGlobe.updateMapMarkers();
                }
            };
        });
    },

    bindEvents: function() {
        const globeSection = document.getElementById('globe-section');
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');
        
        const toggleGlobe = (forceShow = false) => {
            if (!globeSection) return;
            const willHide = forceShow ? false : !globeSection.classList.contains('minimized');
            if (willHide) {
                globeSection.classList.add('minimized');
                if (bookmark) bookmark.classList.remove('hidden');
            } else {
                globeSection.classList.remove('minimized');
                if (bookmark) bookmark.classList.add('hidden');
            }
        };

        if (hideBtn) hideBtn.onclick = () => toggleGlobe();
        if (bookmark) bookmark.onclick = () => toggleGlobe(true);

        const btn2d = document.getElementById('btn-2d');
        const btn3d = document.getElementById('btn-3d');
        if (btn2d && btn3d) {
            btn2d.onclick = () => {
                btn3d.classList.remove('active');
                btn2d.classList.add('active');
                if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView('2d');
            };
            btn3d.onclick = () => {
                btn2d.classList.remove('active');
                btn3d.classList.add('active');
                if (window.RasMirqabGlobe) window.RasMirqabGlobe.toggleView('3d');
            };
        }

        const btnLayers = document.getElementById('btn-layers');
        const layersModal = document.getElementById('layers-modal');
        if (btnLayers && layersModal) {
            btnLayers.onclick = (e) => {
                e.stopPropagation();
                layersModal.classList.toggle('hidden');
            };
        }
        const closeLayers = document.getElementById('close-layers');
        if (closeLayers) closeLayers.onclick = () => layersModal.classList.add('hidden');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
        });
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
