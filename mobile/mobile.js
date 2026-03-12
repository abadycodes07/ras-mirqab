(function () {
    'use strict';

    var PROXY_BASE = 'https://ras-mirqab-proxy.onrender.com';
    var STATIC_DATA = 'https://abadycodes07.github.io/ras-mirqab/public/data/news-live.json';
    var seenIds = new Set();
    var allNews = [];
    var toggledTimes = new Set();

    var LOGOS = {
        'ajanews': '../public/logos/aljazeera.png',
        'alrougui': '../public/logos/alrougui.jpg',
        'NewsNow4USA': '../public/logos/newsnow.jpg',
        'AJELNEWS24': '../public/logos/alekhbariya.png',
        'AsharqNewsBrk': '../public/logos/asharq.png',
        'Alhadath_Brk': '../public/logos/alhadath.png',
        'modgovksa': '../public/logos/modgovksa2.png'
    };

    // ═══ TIME HELPERS (Sync with Desktop) ═══
    function timeAgoAr(dateStr) {
        var diff = Date.now() - new Date(dateStr);
        var s = Math.floor(diff / 1000);
        if (s < 1) return 'الآن';
        if (s < 60) return s + ' ثانية';
        var m = Math.floor(s / 60);
        if (m === 1) return 'دقيقة';
        if (m < 11) return m + ' دقائق';
        if (m < 60) return m + ' دقيقة';
        var h = Math.floor(m / 60);
        if (h === 1) return 'ساعة';
        if (h < 24) return h + ' ساعة';
        return Math.floor(h / 24) + ' أيام';
    }

    // ═══ GLOBE (Fixed Paths & Premium Lighting) ═══
    function initGlobe() {
        var container = document.getElementById('globe-container');
        if (!container) return;

        // Ensure container has dimensions before init
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(initGlobe, 100);
            return;
        }

        if (typeof Globe === 'undefined') {
            console.error('Globe library not found. Retrying...');
            setTimeout(initGlobe, 500);
            return;
        }

        try {
            console.log('Initializing Globe...');
            var globe = Globe()(container)
                .backgroundColor('rgba(0,0,0,0)')
                .showGlobe(true)
                .globeImageUrl('../src/assets/earth-dark.jpg')
                .bumpImageUrl('../src/assets/earth-topology.png')
                .showAtmosphere(true)
                .atmosphereColor('#d4a017')
                .atmosphereAltitude(0.15)
                .width(container.clientWidth)
                .height(container.clientHeight);

            globe.pointOfView({ lat: 25, lng: 45, altitude: 2.3 });

            var controls = globe.controls();
            if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.6;
                controls.enableZoom = false;
            }

            // Enhanced Lighting for OLED screens
            setTimeout(function () {
                if (typeof THREE === 'undefined') {
                    console.warn('THREE.js not found for lighting');
                    return;
                }
                var scene = globe.scene();
                scene.children.forEach(function (ch) { if (ch.type.includes('Light')) scene.remove(ch); });
                
                scene.add(new THREE.AmbientLight(0x444444, 0.4));
                var sun = new THREE.DirectionalLight(0xffffff, 1.8);
                sun.position.set(5, 3, 5);
                scene.add(sun);
                
                var rim = new THREE.PointLight(0xd4a017, 1.5, 0, 2);
                rim.position.set(-5, -2, -5);
                scene.add(rim);
            }, 500);

            window.addEventListener('resize', function () {
                globe.width(container.clientWidth).height(container.clientHeight);
            });
            window._globe = globe;
        } catch (e) { console.error('Globe Error:', e); }
    }

    // ═══ NEWS ENGINE (Proxy-Based / Desktop Sync) ═══
    async function loadNews() {
        var promises = [
            // Telegram
            fetch(PROXY_BASE + '/telegram?channel=ajanews&fast=true').then(r => r.json()).catch(() => ({ items: [] })),
            // ALL Twitter list tweets in one call (12 accounts)
            fetch(PROXY_BASE + '/twitter').then(r => r.json()).catch(() => ({ items: [] }))
        ];

        // Add static fallback
        promises.push(fetch(STATIC_DATA + '?t=' + Date.now()).then(r => r.json()).catch(() => ({ items: [] })));

        try {
            var results = await Promise.all(promises);
            var merged = [];
            results.forEach(res => {
                if (res && res.items) merged = merged.concat(res.items);
            });

            merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            allNews = merged;
            renderNews();
        } catch (e) { console.error('Fetch Error:', e); }
    }

    function renderNews() {
        var list = document.getElementById('news-list');
        if (!list) return;

        var html = '';
        allNews.slice(0, 30).forEach((it, i) => {
            var id = (it.link || '') + it.pubDate;
            var displayTime = toggledTimes.has(id) ? 
                new Date(it.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 
                timeAgoAr(it.pubDate);
            
            var avatar = it.customAvatar || LOGOS[it.handle] || '../public/logos/aljazeera.png';
            var thumb = it.localMedia || it.mediaUrl || avatar;

            html += `
                <div class="news-item" onclick="window.open('${it.link}','_blank')">
                    <div class="news-item-left">
                        <span class="ni-time" onclick="event.stopPropagation(); window._toggleTime('${id}')">${displayTime}</span>
                        <img src="${avatar}" class="ni-avatar">
                    </div>
                    <div class="news-item-center">
                        <div class="ni-text">${it.title}</div>
                    </div>
                    <div class="news-item-right">
                        <img src="${thumb}" class="ni-thumb" onerror="this.src='${avatar}'">
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    window._toggleTime = function (id) {
        if (toggledTimes.has(id)) toggledTimes.delete(id);
        else toggledTimes.add(id);
        renderNews();
    };

    // ═══ LIVE TV (Carousel) ═══
    var TV_CHANNELS = [
        { name: 'الجزيرة', vid: 'bNyUyrR0PHo', logo: '../public/logos/aljazeera.png' },
        { name: 'العربية', vid: 'n7eQejkXbnM', logo: '../public/logos/alarabiya.png' },
        { name: 'سكاي نيوز', vid: 'U--OjmpjF5o', logo: '../public/logos/skynews.png' },
        { name: 'الحدث', vid: 'xWXpl7azI8k', logo: '../public/logos/alhadath.png' }
    ];

    function initTV() {
        var carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        carousel.innerHTML = TV_CHANNELS.map((ch, i) => `
            <div class="tv-card ${i === 0 ? 'active' : ''}" onclick="window._playTV('${ch.vid}', this)">
                <div class="tv-live-badge">LIVE</div>
                <img src="${ch.logo}" class="tv-thumb" onerror="this.src='https://img.youtube.com/vi/${ch.vid}/mqdefault.jpg'">
            </div>
        `).join('');
    }

    window._playTV = function(vid, el) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        // In a real app, this would update an iframe or player
        console.log('Playing TV:', vid);
    };

    // ═══ WIDGET DATA ═══
    async function updateGoldPrice() {
        try {
            // Mocking data for high-density feel as in desktop
            var price = (2650 + Math.random() * 5).toFixed(2);
            var el = document.querySelector('.w-main');
            if (el && el.innerText.includes('5,171')) {
                el.innerText = price + ' USD';
            }
        } catch (e) {}
    }

    // ═══ CLOCKS ═══
    function updateClocks() {
        var f = tz => new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        var riyadh = document.getElementById('clk-riyadh'); if (riyadh) riyadh.textContent = f('Asia/Riyadh');
        var nyc = document.getElementById('clk-nyc'); if (nyc) nyc.textContent = f('America/New_York');
        var london = document.getElementById('clk-london'); if (london) london.textContent = f('Europe/London');
    }

    // ═══ INIT ═══
    function init() {
        initGlobe();
        loadNews();
        initTV();
        setInterval(loadNews, 30000);
        setInterval(renderNews, 1000); 
        updateClocks();
        setInterval(updateClocks, 1000);
        setInterval(updateGoldPrice, 5000);
        
        var sync = document.getElementById('btn-hard-sync');
        if (sync) sync.onclick = () => location.reload();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
