/**
 * RAS MIRQAB MOBILE V37 - THE FINAL SCRATCH REBUILD
 * Objective: 100% self-contained logic for News, TV, and Widgets.
 * No dependencies on desktop widget files.
 */

const MobileApp = {
    version: 'v37',
    
    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V37: SCRATCH REBUILD ---');
        
        // 1. Initialize Globe (Shared Logic remains)
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }

        // 2. Initialize Self-Contained Modules
        this.initNews();
        this.initTV();
        this.initWidgets();
        this.bindEvents();
        
        // Final UI Polish
        document.body.classList.add('v37-ready');
    },

    // ═══ NEWS MODULE (Independent) ═══
    initNews: async function() {
        const container = document.getElementById('breaking-news-body');
        if (!container) return;

        try {
            // Fetch directly from the scraper output
            const resp = await fetch('../public/news.json?v=' + Date.now());
            const data = await resp.json();
            const items = data.items || data; // Handle both array and object formats

            if (!items || items.length === 0) throw new Error("No news items");

            // Render exactly 3 items to match reference image perfection
            container.innerHTML = items.slice(0, 3).map((item, idx) => {
                const time = new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                const thumb = item.mediaUrl || item.image || '../public/logos/default.png';
                const sourceLogo = `../public/logos/${item.sourceHandle ? item.sourceHandle.toLowerCase() : 'default'}.jpg`;
                
                return `
                    <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                        <div class="ni-left-stack">
                            <span class="ni-time">${time}</span>
                            <img src="${sourceLogo}" class="ni-source-logo" onerror="this.src='../public/logos/default.png'">
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

        } catch (err) {
            console.warn("News Fetch Error:", err);
            container.innerHTML = '<div class="error-state">لا يوجد أخبار حالياً</div>';
        }
    },

    // ═══ LIVE TV MODULE (Independent) ═══
    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        const player = document.getElementById('tv-player-wrapper');
        if (!carousel || !player) return;

        const channels = [
            { id: 'aljazeera', name: 'Al Jazeera', slug: 'ALJAZEERA', logo: 'https://v3.aljazeera.net/wp-content/themes/aljazeera/assets/images/logo-ar.png', ytId: 'bNyUCPTvalg' },
            { id: 'alarabiya', name: 'Al Arabiya', slug: 'AL ARABIYA', logo: 'https://www.alarabiya.net/favicon.ico', ytId: '-PjD_X_8x6E' },
            { id: 'hadath', name: 'Al Hadath', slug: 'AL HADATH', logo: 'https://www.alhadath.net/favicon.ico', ytId: 'f0Xunf9Okp8' },
            { id: 'sky', name: 'Sky News Arabia', slug: 'SKY NEWS', logo: 'https://www.skynewsarabia.com/favicon.ico', ytId: '9vMsh_Lz51Y' }
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

        player.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&showinfo=0" 
                    frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        `;
    },

    // ═══ WIDGETS MODULE (Independent) ═══
    initWidgets: function() {
        const grid = document.getElementById('mobile-widgets-grid');
        if (!grid) return;

        const widgets = [
            { label: 'توقيت الرياض', id: 'clock', val: '--:--', icon: '🌍' },
            { label: 'الذهب (USD)', id: 'gold', val: '$2,175.40', icon: '💰' },
            { label: 'تحركات سيبرانية', id: 'cyber', val: 'MONITORING', icon: '🛡️' },
            { label: 'مؤشر السوق', id: 'market', val: '+1.44% ▲', icon: '📊' }
        ];

        grid.innerHTML = widgets.map(w => `
            <div class="widget-card" id="w-${w.id}">
                <div class="w-header">
                    <span class="w-label">${w.label}</span>
                    <span class="w-icon">${w.icon}</span>
                </div>
                <div class="w-main" id="val-${w.id}">${w.val}</div>
                <div class="w-chart-deco"></div>
                <span class="badge-t7">V37</span>
            </div>
        `).join('');

        // Live Clock
        setInterval(() => {
            const el = document.getElementById('val-clock');
            if (el) el.innerText = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

    bindEvents: function() {
        // Simple Navigation Active State
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Hide Map Logic
        const hideBtn = document.getElementById('btn-hide-map');
        if (hideBtn) {
            hideBtn.onclick = () => {
                const globeWrap = document.getElementById('globe-section');
                if (globeWrap) globeWrap.classList.toggle('minimized');
            };
        }
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
