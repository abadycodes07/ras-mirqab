/**
 * RAS MIRQAB MOBILE V57 - THE NUCLEAR REBIRTH
 * Ground-up reconstruction linking new UI to shared backend.
 */

const MobileAppV57 = {
    version: '57.0.0',
    activeVideoId: null,
    isPiPActive: false,

    init() {
        console.log(`%c 🚀 RAS MIRQAB MOBILE V57 REBIRTH `, 'background: #d47b4a; color: #000; font-weight: bold;');
        
        this.initGlobe();
        this.initNews();
        this.initTV();
        this.initWidgets();
        this.bindEvents();
    },

    // ═══ GLOBE INTEGRATION ═══
    initGlobe() {
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }
    },

    // ═══ NEWS WIDGET (EXACT RTL MOCKUP) ═══
    initNews() {
        if (!window.BreakingNewsWidget) return;

        const feed = document.getElementById('news-feed-v57');
        
        // OVERRIDE RENDER FOR PIXEL PERFECT RTL MOCKUP
        window.BreakingNewsWidget.renderOverride = (container, items) => {
            if (!container) return;
            
            container.innerHTML = items.slice(0, 15).map(item => {
                const date = item.pubDate ? new Date(item.pubDate) : new Date();
                const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                
                // Construct fixed path
                const logo = `../public/logos/${handle}.jpg`;
                
                let thumb = null;
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                
                return `
                    <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                        <div class="n-meta">
                            <span class="n-time">${timeStr}</span>
                            <img src="${logo}" class="n-logo" onerror="this.src='../public/logos/default.png'">
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

    // ═══ TV & PiP LOGIC ═══
    initTV() {
        const carousel = document.getElementById('tv-feed-v57');
        if (!carousel) return;

        const channels = [
            { name: 'الجزيرة', id: 'bNyUyrR0PHo' },
            { name: 'العربية', id: 'n7eQejkXbnM' },
            { name: 'الحدث', id: 'xWXpl7azI8k' },
            { name: 'TRT Arabic', id: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map(ch => `
            <div class="tv-card glass" data-ytid="${ch.id}" id="card-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.6;">
                <div class="tv-live-tag">LIVE</div>
                <div style="position:absolute; bottom:8px; right:8px; font-size:10px; font-weight:800; color:#fff;">${ch.name}</div>
                <div class="video-container" id="player-${ch.id}" style="position:absolute; inset:0; display:none;"></div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.onclick = () => this.playInCard(card);
        });
    },

    playInCard(card) {
        const id = card.getAttribute('data-ytid');
        if (this.activeVideoId === id) return;

        // Reset others
        document.querySelectorAll('.video-container').forEach(c => {
            c.style.display = 'none';
            c.innerHTML = '';
        });

        this.activeVideoId = id;
        const player = card.querySelector('.video-container');
        player.style.display = 'block';
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=0&controls=0" frameborder="0" allow="autoplay" style="width:100%; height:100%;"></iframe>`;
    },

    // ═══ WIDGETS ═══
    initWidgets() {
        // Gold / Market
        const market = document.getElementById('market-viz');
        if (market) {
            market.innerHTML = `<iframe src="https://s.tradingview.com/embed-widget/single-quote/?symbol=OANDA%3AXAUUSD&colorTheme=dark&isTransparent=true&width=100%&height=90" frameborder="0" style="width:100%; height:90px;"></iframe>`;
        }

        // Clocks
        const clocks = document.getElementById('clocks-viz');
        if (clocks) {
            const updateClock = () => {
                const nyc = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' });
                const kwt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kuwait' });
                clocks.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:10px;">
                        <span>NYC</span> <span style="font-family:Orbitron; color:var(--lux-orange); font-weight:700;">${nyc}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>KUWAIT</span> <span style="font-family:Orbitron; color:var(--lux-orange); font-weight:700;">${kwt}</span>
                    </div>
                `;
            };
            updateClock();
            setInterval(updateClock, 60000);
        }
    },

    bindEvents() {
        // PiP Auto-Detach on Scroll
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;
            const threshold = 400; // Passed TV section
            
            if (this.activeVideoId && scrollPos > threshold && !this.isPiPActive) {
                this.enterPiP();
            } else if (scrollPos < threshold && this.isPiPActive) {
                this.exitPiP();
            }
        });

        // 2D/3D Toggles
        document.getElementById('view-toggle').onclick = () => {
            const is3d = document.getElementById('label-3d').classList.toggle('active');
            document.getElementById('label-2d').classList.toggle('active');
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.toggleView(is3d ? '3d' : '2d');
            }
        };

        // Hide Map
        document.getElementById('btn-hide-map').onclick = () => {
            document.body.classList.toggle('map-hidden');
        };
    },

    enterPiP() {
        this.isPiPActive = true;
        let pip = document.getElementById('v57-pip-wrap');
        if (!pip) {
            pip = document.createElement('div');
            pip.id = 'v57-pip-wrap';
            pip.className = 'pip-wrapper glass';
            pip.innerHTML = `<div id="pip-handle" style="position:absolute; top:4px; right:4px; z-index:10; cursor:pointer;">×</div><div id="pip-target" style="width:100%; height:100%;"></div>`;
            document.body.appendChild(pip);
            pip.querySelector('#pip-handle').onclick = () => this.stopPiP();
        }
        pip.style.display = 'block';
        const target = document.getElementById('pip-target');
        target.innerHTML = `<iframe src="https://www.youtube.com/embed/${this.activeVideoId}?autoplay=1&mute=0&controls=0" frameborder="0" allow="autoplay" style="width:100%; height:100%;"></iframe>`;
        
        // Hide card video
        const cardVideo = document.getElementById(`player-${this.activeVideoId}`);
        if (cardVideo) cardVideo.style.opacity = '0';
    },

    exitPiP() {
        this.isPiPActive = false;
        const pip = document.getElementById('v57-pip-wrap');
        if (pip) pip.style.display = 'none';
        
        const cardVideo = document.getElementById(`player-${this.activeVideoId}`);
        if (cardVideo) cardVideo.style.opacity = '1';
    },

    stopPiP() {
        this.exitPiP();
        this.activeVideoId = null;
        document.querySelectorAll('.video-container').forEach(v => {
            v.style.display = 'none';
            v.innerHTML = '';
        });
    }
};

window.MobileAppV57 = MobileAppV57;
document.addEventListener('DOMContentLoaded', () => MobileAppV57.init());
