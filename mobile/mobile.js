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
    var activeLayers = {};
    
    function initGlobe() {
        var container = document.getElementById('globe-container');
        if (!container) return;

        if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(initGlobe, 100);
            return;
        }

        if (typeof Globe === 'undefined') {
            setTimeout(initGlobe, 500);
            return;
        }

        try {
            // Initialize active layers from data
            if (window.RasMirqabData && RasMirqabData.categories) {
                Object.keys(RasMirqabData.categories).forEach(k => {
                    activeLayers[k] = RasMirqabData.categories[k].default;
                });
            }

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
                if (typeof THREE === 'undefined') return;
                var scene = globe.scene();
                scene.children.forEach(ch => { if (ch.type.includes('Light')) scene.remove(ch); });
                
                scene.add(new THREE.AmbientLight(0x444444, 0.4));
                var sun = new THREE.DirectionalLight(0xffffff, 1.8);
                sun.position.set(5, 3, 5);
                scene.add(sun);
                
                var rim = new THREE.PointLight(0xd4a017, 1.5, 0, 2);
                rim.position.set(-5, -2, -5);
                scene.add(rim);
            }, 500);

            window.addEventListener('resize', () => {
                globe.width(container.clientWidth).height(container.clientHeight);
            });
            window._globe = globe;
            
            updateGlobeVisuals();
            initLayersUI();
        } catch (e) { console.error('Globe Error:', e); }
    }

    function updateGlobeVisuals() {
        if (!window._globe || !window.RasMirqabData) return;
        var globe = window._globe;
        
        // Filter points by active layers
        var points = RasMirqabData.points.filter(p => activeLayers[p.cat] !== false);
        
        globe.htmlElementsData(points)
            .htmlElement(d => {
                var el = document.createElement('div');
                var cat = RasMirqabData.categories[d.cat] || { color: '#fff', emoji: '📍' };
                el.innerHTML = `<div style="color:${cat.color}; font-size:14px; filter:drop-shadow(0 0 5px ${cat.color})">${cat.emoji}</div>`;
                return el;
            });

        // Paths (Pipelines/Cables)
        var paths = [];
        if (activeLayers['pipelines'] && RasMirqabData.complex?.pipelines) {
            paths = paths.concat(RasMirqabData.complex.pipelines.map(p => ({ ...p, color: '#55efc4' })));
        }
        if (activeLayers['cables'] && RasMirqabData.complex?.cables) {
            paths = paths.concat(RasMirqabData.complex.cables.map(c => ({ ...c, color: '#00cec9' })));
        }
        
        globe.pathsData(paths)
            .pathColor(d => d.color || '#fff')
            .pathDashLength(0.01)
            .pathDashGap(0.004)
            .pathDashAnimateTime(100000);
    }

    // ═══ LAYERS UI ═══
    function initLayersUI() {
        var btn = document.getElementById('btn-layers');
        var modal = document.getElementById('layers-modal');
        var close = document.getElementById('close-layers');
        var list = document.getElementById('layers-list');

        if (!btn || !modal || !list) return;

        btn.onclick = (e) => {
            e.stopPropagation();
            modal.classList.toggle('hidden');
        };

        close.onclick = () => modal.classList.add('hidden');
        document.addEventListener('click', (e) => {
            if (!modal.contains(e.target) && e.target !== btn) modal.classList.add('hidden');
        });

        // Build list
        if (window.RasMirqabData && RasMirqabData.categories) {
            var html = '';
            Object.keys(RasMirqabData.categories).forEach(key => {
                var cat = RasMirqabData.categories[key];
                html += `
                    <div class="layer-item">
                        <div class="layer-info">
                            <span class="layer-dot" style="color:${cat.color}; background:${cat.color}"></span>
                            <span class="layer-name">${cat.emoji} ${cat.labelAr}</span>
                        </div>
                        <input type="checkbox" class="layer-check" ${activeLayers[key] !== false ? 'checked' : ''} 
                               onchange="window._toggleLayer('${key}', this.checked)">
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    }

    window._toggleLayer = function(key, val) {
        activeLayers[key] = val;
        updateGlobeVisuals();
    };

    // ═══ NEWS ENGINE (Proxy-Based / Desktop Sync) ═══
    async function loadNews() {
        var promises = [
            fetch(PROXY_BASE + '/telegram?channel=ajanews&fast=true&t=' + Date.now()).then(r => r.json()).catch(() => ({ items: [] })),
            fetch(PROXY_BASE + '/twitter?t=' + Date.now()).then(r => r.json()).catch(() => ({ items: [] }))
        ];

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
                        <span class="ni-time">${displayTime}</span>
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
        list.innerHTML = html || '<div style="text-align:center; padding:20px; color:#555;">لا توجد أخبار حالية</div>';
    }

    // ═══ LIVE TV (Carousel) ═══
    var TV_CHANNELS = [
        { name: 'الجزيرة', vid: 'bNyUyrR0PHo', logo: '../public/logos/aljazeera.png' },
        { name: 'العربية', vid: 'n7eQejkXbnM', logo: '../public/logos/alarabiya.png' },
        { name: 'سكاي نيوز', vid: 'U--OjmpjF5o', logo: '../public/logos/skynews.png' },
        { name: 'الحدث', vid: 'xWXpl7azI8k', logo: '../public/logos/alhadath.png' },
        { name: 'TRT World', vid: '6_pXN-8_S2Y', logo: '../public/logos/trt.png' }
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
    };

    // ═══ WIDGET DATA ═══
    async function updateGoldPrice() {
        try {
            var price = (2650 + Math.random() * 5).toFixed(2);
            var el = document.querySelector('.w-main');
            if (el) el.innerText = price + ' USD';
        } catch (e) {}
    }

    // ═══ CLOCKS ═══
    function updateClocks() {
        var f = (tz, id) => {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        f('Asia/Riyadh', 'clk-riyadh');
        f('America/New_York', 'clk-nyc');
        f('Europe/London', 'clk-london');
    }

    // ═══ INIT ═══
    function init() {
        // Load data dependencies first
        var scripts = ['../src/data/conflicts.js', '../src/data/intelligence.js'];
        var loaded = 0;
        scripts.forEach(src => {
            var s = document.createElement('script');
            s.src = src + '?v=' + Date.now();
            s.onload = () => {
                loaded++;
                if (loaded === scripts.length) initGlobe();
            };
            document.body.appendChild(s);
        });

        loadNews();
        initTV();
        setInterval(loadNews, 15000); // Faster sync: 15s
        setInterval(updateClocks, 1000);
        setInterval(updateGoldPrice, 5000);
        
        var sync = document.getElementById('btn-hard-sync');
        if (sync) sync.onclick = () => location.reload();
        
        // 2D/3D Toggles
        document.getElementById('btn-2d').onclick = () => {
            document.getElementById('btn-2d').classList.add('active');
            document.getElementById('btn-3d').classList.remove('active');
            // Simplified for now, in a full app we'd swap engines
        };
        document.getElementById('btn-3d').onclick = () => {
            document.getElementById('btn-3d').classList.add('active');
            document.getElementById('btn-2d').classList.remove('active');
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
