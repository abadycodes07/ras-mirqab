/**
 * RAS MIRQAB MOBILE V37 - THE FINAL SCRATCH REBUILD
 * Objective: 100% self-contained logic for News, TV, and Widgets.
 * No dependencies on desktop widget files.
 */

const MobileApp = {
    version: 'v42',
    isAudioUnlocked: false,
    
    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V42: CONTROL RESCUE ---');
        
        // 1. Initialize Globe
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }

        // 2. Initialize Desktop News Engine
        this.initDesktopNews();

        // 3. Initialize Shared Modules
        this.initTV();
        this.initWidgets();
        this.bindEvents();
        this.initAudioGuard();
        this.initLayersPanel();
        
        document.body.classList.add('v42-ready');
    },

    initAudioGuard: function() {
        // Essential to bypass "No Autoplay with Audio" browser rules
        const unlock = () => {
            if (this.isAudioUnlocked) return;
            this.isAudioUnlocked = true;
            
            // Try to unmute existing player if any
            const iframe = document.querySelector('#tv-player-wrapper iframe');
            if (iframe && iframe.src.includes('mute=1')) {
                iframe.src = iframe.src.replace('mute=1', 'mute=0');
            }
            
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
    },

    // ═══ NEWS MODULE (Desktop Engine Sync + V42 Premium Decor) ═══
    initDesktopNews: function() {
        if (!window.BreakingNewsWidget) {
            return;
        }

        // Override the Desktop Renderer for Mobile Compact Look
        window.BreakingNewsWidget.renderItems = (items) => {
            const container = document.getElementById('breaking-news-body');
            if (!container) return;

            // Mockup Layout (V39 Compact - Updated for V41)
            container.innerHTML = items.slice(0, 5).map(item => {
                const timeStr = new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const handle = (item.sourceHandle || 'default').toLowerCase();
                const sourceLogo = `../public/logos/${handle}.jpg`;
                const thumb = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : '../public/logos/default.png');
                
                // Detection logic for Platform Badge
                let platformIcon = 'rss';
                const link = (item.link || '').toLowerCase();
                if (link.includes('t.me')) platformIcon = 'telegram';
                else if (link.includes('x.com') || link.includes('twitter')) platformIcon = 'twitter';
                
                const platformSrc = `../public/icons/${platformIcon}.png`;

                return `
                    <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                        <div class="ni-left-stack">
                            <span class="ni-time">${timeStr}</span>
                            <div class="ni-source-logo-wrap">
                                <img src="${sourceLogo}" class="ni-source-logo" onerror="this.src='../public/logos/default.png'">
                                <div class="ni-platform-badge">
                                    <img src="${platformSrc}" onerror="this.src='../public/icons/rss.png'">
                                </div>
                            </div>
                        </div>
                        <div class="ni-content">
                            <div class="ni-text">${item.title}</div>
                        </div>
                        <div class="ni-thumbnail-right">
                            <img src="${thumb}" class="ni-thumb-img" onerror="this.src='../public/logos/default.png'">
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Start the Engine (This handles the actual fetching/polling)
        window.BreakingNewsWidget.init();
    },

    // ═══ LIVE TV MODULE (Independent) ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const channels = [
            { name: 'Al Jazeera', slug: 'ALJAZEERA', logo: '../public/logos/aljazeera.jpg', ytId: 'bNyUCPTvalg' },
            { name: 'Al Arabiya', slug: 'AL ARABIYA', logo: '../public/logos/alarabiya.jpg', ytId: '-PjD_X_8x6E' },
            { name: 'Al Hadath', slug: 'AL HADATH', logo: '../public/logos/hadath.jpg', ytId: 'f0Xunf9Okp8' },
            { name: 'Sky News', slug: 'SKY NEWS', logo: '../public/logos/sky.jpg', ytId: '9vMsh_Lz51Y' }
        ];

        // Render Carousel
        carousel.innerHTML = channels.map((ch, idx) => `
            <div class="tv-card ${idx === 0 ? 'active' : ''}" onclick="MobileApp.playTV('${ch.ytId}', this)">
                <div class="tv-live-badge">LIVE</div>
                <img src="https://img.youtube.com/vi/${ch.ytId}/mqdefault.jpg" class="tv-thumb">
                <span class="tv-card-name">${ch.name}</span>
            </div>
        `).join('');

        // Autoplay Al Jazeera
        this.playTV(channels[0].ytId, carousel.children[0]);
    },

    playTV: function(ytId, el) {
        const player = document.getElementById('tv-player-wrapper');
        if (!player) return;

        // Visual feedback
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('active'));
        if (el) el.classList.add('active');

        // By default we mute=1 for autoplay compliance, but if user has interacted, we mute=0
        const muteState = this.isAudioUnlocked ? '0' : '1';

        player.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muteState}&rel=0&showinfo=0" 
                    frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        `;
    },

    // ═══ WIDGETS MODULE (Independent) ═══
    initWidgets: function() {
        const grid = document.getElementById('mobile-widgets-grid');
        if (!grid) return;

        const widgets = [
            { label: 'توقيت الرياض', id: 'clock', val: '--:--', icon: '🌍' },
            { label: 'الذهب (USD)', id: 'gold', val: '$2,175', icon: '💰' },
            { label: 'سيبراني', id: 'cyber', val: 'SECURE', icon: '🛡️' },
            { label: 'السوق', id: 'market', val: '+1.2%', icon: '📊' }
        ];

        grid.innerHTML = widgets.map(w => `
            <div class="widget-card">
                <div class="w-header"><span>${w.label}</span></div>
                <div class="w-main" id="val-${w.id}">${w.val}</div>
            </div>
        `).join('');

        // Live Clock
        setInterval(() => {
            const el = document.getElementById('val-clock');
            if (el) el.innerText = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        }, 1000);

        // Simulated updates for others
        setInterval(() => {
            const cyber = document.getElementById('val-cyber');
            if (cyber) {
                const states = ['SCANNING', 'ACTIVE', 'PROTECTED', 'THREAT: LOW'];
                cyber.innerText = states[Math.floor(Math.random() * states.length)];
            }
        }, 5000);
    },

    // ═══ LAYERS PANEL (Side Panel Logic) ═══
    initLayersPanel: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData || !RasMirqabData.categories) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            return `
                <label class="layer-item">
                    <input type="checkbox" data-layer="${key}" ${cat.default !== false ? 'checked' : ''}>
                    <span>${cat.emoji} ${cat.labelAr}</span>
                </label>
            `;
        }).join('');

        list.querySelectorAll('input').forEach(input => {
            input.onchange = (e) => {
                const lid = e.target.getAttribute('data-layer');
                if (window.RasMirqabGlobe) {
                    // Update activeLayers in the globe engine
                    if (window.RasMirqabGlobe.activeLayers) {
                        window.RasMirqabGlobe.activeLayers[lid] = e.target.checked;
                    }
                    // Trigger refresh
                    if (window.RasMirqabGlobe.updateGlobeMarkers) window.RasMirqabGlobe.updateGlobeMarkers();
                    if (window.RasMirqabGlobe.updateMapMarkers) window.RasMirqabGlobe.updateMapMarkers();
                }
            };
        });
    },

    bindEvents: function() {
        // 1. Layers Toggle
        const btnLayers = document.getElementById('btn-layers');
        const layersModal = document.getElementById('layers-modal');
        const closeLayers = document.getElementById('close-layers');

        if (btnLayers && layersModal) {
            btnLayers.onclick = (e) => {
                e.stopPropagation();
                layersModal.classList.toggle('hidden');
            };
        }
        if (closeLayers) {
            closeLayers.onclick = () => layersModal.classList.add('hidden');
        }

        // 2. Mode Toggle (2D / 3D)
        const btn2d = document.getElementById('btn-2d');
        const btn3d = document.getElementById('btn-3d');
        const globeContainer = document.getElementById('globe-container');
        const mapContainer = document.getElementById('map-container');

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

        // 3. Hide / Show Map (Bookmark Logic)
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');
        const globeSection = document.getElementById('globe-section');

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

        // Close side panel on map click
        if (globeSection) {
            globeSection.onclick = () => {
                if (layersModal) layersModal.classList.add('hidden');
            };
        }

        // 4. Simple Navigation Active State
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                // Not preventing default to allow hash links/anchors if any
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
        });
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
