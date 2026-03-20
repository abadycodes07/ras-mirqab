/* ═══════════════════════════════════════════════
   BREAKING NEWS WIDGET (عاجل)
   ═══════════════════════════════════════════════ */

var BreakingNewsWidget = (function () {
    var STORAGE_KEY = 'rasmirqab_custom_sources';
    // V57: 3-Layer Architecture — RSS.app | TwitterAPI.io | Python Scraper Fallback
    var TWITTER_API_KEY = 'new1_9a59c3ffc7e04c0bb5032b97c2d06ef5';
    var TWITTER_LIST_ID = '2031445708524421549';
    var RSS_APP_FEED    = 'https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json';
    var BACKEND_URL     = window.location.origin.includes('localhost') 
                          ? 'http://localhost:3001' 
                          : 'https://ras-mirqab-production.up.railway.app';

    var VERSION = "V71.4-FIX";
    var hoverEnabled = localStorage.getItem('rasmirqab_bn_hover') !== 'false';
    var popupEl = null;
    var refreshTimer = null;
    var seenIds = new Set();
    var isFirstLoad = true;
    var settingsOpen = false;
    var localCache = [];
    var hiddenSources = new Set(JSON.parse(localStorage.getItem('rasmirqab_hidden_sources') || '[]'));
    var currentMirrorIndex = 0;
    var NITTER_MIRRORS = [
        'https://ras-mirqab-production.up.railway.app', // Primary
        'https://nitter.net',
        'https://nitter.cz',
        'https://nitter.it',
        'https://nitter.privacydev.net',
        'https://nitter.dafrary.com'
    ];

    function getArabicRelativeTime(date) {
        if (!date) return 'قبل قليل';
        var now = new Date();
        var then = new Date(date);
        var diff = Math.floor((now - then) / 1000); // seconds

        if (diff < 0) diff = 0;
        if (diff < 10) return 'الآن';
        if (diff < 60) return 'قبل ' + diff + ' ثانية';
        
        var mins = Math.floor(diff / 60);
        if (mins === 1) return 'قبل دقيقة';
        if (mins === 2) return 'قبل دقيقتين';
        if (mins < 11) return 'قبل ' + mins + ' دقائق';
        if (mins < 60) return 'قبل ' + mins + ' دقيقة';
        
        var hours = Math.floor(mins / 60);
        if (hours === 1) return 'قبل ساعة';
        if (hours === 2) return 'قبل ساعتين';
        if (hours < 11) return 'قبل ' + hours + ' ساعات';
        if (hours < 24) return 'قبل ' + hours + ' ساعة';
        
        var days = Math.floor(hours / 24);
        if (days === 1) return 'أمس';
        if (days === 2) return 'قبل يومين';
        return 'قبل ' + days + ' أيام';
    }

    function getSources() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveSources(arr) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    function render() {
        return {
            header:
                '<div class="widget-header breaking-header-v12">' +
                '  <div class="breaking-top-layer-ref">' +
                '    <div class="breaking-controls-left">' +
                '      <button class="square-action-btn" id="bn-gear-btn-ref" title="الإعدادات"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>' +
                '      <button class="square-action-btn" id="bn-refresh-btn-ref" title="تحديث"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>' +
                '    </div>' +
                '    <div class="breaking-title-right">' +
                '      <span class="breaking-badge-new">NEW</span>' +
                '      <span class="breaking-text-ar">عاجل <small style="font-size:8px; opacity:0.5;">' + VERSION + '</small></span>' +
                '      <div class="breaking-status-dot"></div>' +
                '    </div>' +
                '  </div>' +
                '</div>',
            body:
                '<div class="widget-body" id="breaking-news-body" style="padding:0;">' +
                '  <div style="color:#666; text-align:center; padding:40px; font-size:12px;">جاري الاتصال...</div>' +
                '</div>',
        };
    }

    // Proxy heartbeat removed in V18

    function init() {
        var gearBtn = document.getElementById('bn-gear-btn-ref');
        if (gearBtn) gearBtn.addEventListener('click', toggleSettings);

        var refreshBtn = document.getElementById('bn-refresh-btn-ref');
        if (refreshBtn) refreshBtn.addEventListener('click', function () {
            fetchServerCache(true);
        });

        var modalAddBtn = document.getElementById('bn-modal-btn-add');
        if (modalAddBtn) {
            modalAddBtn.addEventListener('click', function () {
                var input = document.getElementById('bn-modal-add-source');
                if (input) {
                    addSource(input.value.trim());
                    input.value = '';
                }
            });
        }

        var modalInput = document.getElementById('bn-modal-add-source');
        if (modalInput) {
            modalInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    addSource(modalInput.value.trim());
                    modalInput.value = '';
                }
            });
        }

        var closeBtn = document.getElementById('close-bn-settings-modal');
        if (closeBtn) {
            closeBtn.onclick = function () {
                document.getElementById('bn-settings-modal').classList.add('hidden');
                settingsOpen = false;
            };
        }

        renderSourceList();
        loadNews();
        if (refreshTimer) clearInterval(refreshTimer);
        // V66.0: Turbo 30s Polling (Zero-Lag)
        refreshTimer = setInterval(fetchServerCache, 30000); 

        // Initialize Hover Popup
        if (!document.querySelector('.bn-hover-popup')) {
            popupEl = document.createElement('div');
            popupEl.className = 'bn-hover-popup';
            document.body.appendChild(popupEl);
        } else {
            popupEl = document.querySelector('.bn-hover-popup');
        }
    }

    function toggleSettings(force) {
        if (force === true) settingsOpen = true;
        else if (force === false) settingsOpen = false;
        else settingsOpen = !settingsOpen;

        var modal = document.getElementById('bn-settings-modal');
        if (modal) {
            if (settingsOpen) {
                modal.classList.remove('hidden');
                renderSourceList();
            } else {
                modal.classList.add('hidden');
            }
        }
    }

    // Diagnostics removed in V18 to ensure maximum speed

    function addSource(url) {
        if (!url) return;
        var type = 'unknown';
        var handle = url;
        if (/x\.com|twitter\.com/i.test(url)) {
            type = 'twitter';
            var m = url.match(/(?:x\.com|twitter\.com)\/([^\/?#]+)/i);
            handle = m ? m[1] : url;
        } else if (/t\.me/i.test(url)) {
            type = 'telegram';
            var m2 = url.match(/t\.me\/(?:s\/)?([^\/?#]+)/i);
            handle = m2 ? m2[1] : url;
        }
        var sources = getSources();
        if (sources.some(function (s) { return s.handle === handle && s.type === type; })) return;
        sources.push({ type: type, handle: handle, url: url });
        saveSources(sources);
        renderSourceList();
        loadNews();
    }

    function removeSource(index) {
        var sources = getSources();
        sources.splice(index, 1);
        saveSources(sources);
        renderSourceList();
        loadNews();
    }

    function toggleVisibility(handle) {
        if (hiddenSources.has(handle)) {
            hiddenSources.delete(handle);
        } else {
            hiddenSources.add(handle);
        }
        localStorage.setItem('rasmirqab_hidden_sources', JSON.stringify(Array.from(hiddenSources)));
        renderSourceList();
        loadNews();
    }

    function renderSourceList() {
        var grid = document.getElementById('bn-modal-source-list');
        if (!grid) return;
        var sources = getSources();
        var hardcoded = [
            { type: 'twitter', handle: 'alrougui', name: 'الروقي / alrougui', avatar: 'public/logos/alrougui.jpg', fixed: true },
            { type: 'twitter', handle: 'alekhbariyaNews', name: 'الإخبارية / alekhbariya', avatar: 'public/logos/alekhbariyanews.jpg', fixed: true },
            { type: 'twitter', handle: 'alekhbariyabrk', name: 'الإخبارية - عاجل', avatar: 'public/logos/alekhbariyabrk.jpg', fixed: true },
            { type: 'twitter', handle: 'NewsNow4USA', name: 'News Now 4 USA', avatar: 'public/logos/newsnow4usa.jpg', fixed: true },
            { type: 'twitter', handle: 'modgovksa', name: 'MoD KSA / الدفاع', avatar: 'public/logos/modgovksa.jpg', fixed: true },
            { type: 'twitter', handle: 'AsharqNewsBrk', name: 'Asharq News / الشرق', avatar: 'public/logos/asharqnewsbrk.jpg', fixed: true },
            { type: 'twitter', handle: 'AlHadath', name: 'Al Hadath / الحدث', avatar: 'public/logos/alhadath.jpg', fixed: true },
            { type: 'twitter', handle: 'alarabiya_brk', name: 'العربية عاجل (𝕏)', avatar: 'public/logos/alarabiya_brk.jpg', fixed: true },
            { type: 'twitter', handle: 'skynewsarabia_B', name: 'سكاي نيوز عاجل (𝕏)', avatar: 'public/logos/skynewsarabia_b.jpg', fixed: true },
            { type: 'twitter', handle: 'ajmubasher', name: 'الجزيرة مباشر', avatar: 'public/logos/ajmubasher.jpg', fixed: true },
            { type: 'twitter', handle: 'RTonline_ar', name: 'RT العربية (𝕏)', avatar: 'public/logos/rt.png', fixed: true },
            { type: 'telegram', handle: 'SABQ_NEWS', name: 'صحيفة سبق', avatar: 'public/logos/kbsalsaud.png', fixed: true },
            { type: 'telegram', handle: 'AjelNews24', name: 'عاجل السعودية', avatar: 'public/logos/ajelnews.jpg', fixed: true },
            { type: 'telegram', handle: 'Alarabiya_brk', name: 'العربية عاجل', avatar: 'public/logos/alarabiya.png', fixed: true },
            { type: 'telegram', handle: 'SkyNewsArabia_Breaking', name: 'سكاي نيوز عاجل', avatar: 'public/logos/skynews.png', fixed: true },
            { type: 'telegram', handle: 'RT_Arabic', name: 'RT العربية', avatar: 'public/logos/rt.png', fixed: true },
            { type: 'telegram', handle: 'ajanews', name: 'Al Jazeera / الجزيرة', avatar: 'public/logos/ajanews_new.png', fixed: true },
            { type: 'telegram', handle: 'alhadath_brk', name: 'Al Hadath / الحدث (TG)', avatar: 'public/logos/alhadath.jpg', fixed: true },
            { type: 'rss', handle: 'i24news-ar', name: 'اعلام الاحتلال الاسرائيلي', url: 'https://www.i24news.tv/ar/feed', avatar: 'https://www.i24news.tv/favicon.ico', fixed: true },
            { type: 'rss', handle: 'sabq-org', name: 'صحيفة سبق (موقع)', url: 'https://sabq.org/rss.xml', avatar: 'https://sabq.org/favicon.ico', fixed: true }
        ];
        var all = hardcoded.concat(sources);
        var html = '';
        all.forEach(function (s, i) {
            var statusColor = '#2ecc71';
            var statusText = 'مباشر';
            
            if (s.type === 'telegram') {
                statusText = 'مباشر (Telegram)';
            } else if (s.type === 'twitter') {
                statusText = 'مباشر (𝕏/RSS)';
            }

            var isSelected = s.fixed;
            var isHidden = hiddenSources.has(s.handle);
            var color = s.type === 'twitter' ? '#1DA1F2' : '#0088cc';
            var icon = s.type === 'twitter' ? '<i class="fa-brands fa-x-twitter"></i>' : (s.type === 'telegram' ? '<i class="fa-brands fa-telegram"></i>' : '<i class="fas fa-rss"></i>');

            html +=
                '<div class="channel-card ' + (isSelected ? 'selected' : '') + ' ' + (isHidden ? 'hidden-source' : '') + '" style="cursor:pointer; transition:all 0.3s ease; border:1px solid ' + (isHidden ? 'transparent' : 'var(--accent-dim)') + '; background:' + (isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,106,0,0.05)') + ';" onclick="BreakingNewsWidget.toggleVisibility(\'' + s.handle + '\')">' +
                '  <div class="channel-card-info">' +
                '    <div class="channel-avatar" style="position:relative; overflow:hidden; border-radius:8px; border:1px solid ' + (isHidden ? '#333' : 'var(--accent)') + '; filter:' + (isHidden ? 'grayscale(100%)' : 'none') + '; opacity:' + (isHidden ? '0.4' : '1') + ';">' +
                '      <img src="' + (s.avatar || 'public/logos/default.png') + '" onerror="this.src=\'public/logos/default.png\'" style="width:100%; height:100%; object-fit:cover;">' +
                '      <span style="position:absolute; bottom:0; right:0; width:10px; height:10px; border-radius:50%; background:' + statusColor + '; border:2px solid #111; z-index:5;"></span>' +
                '    </div>' +
                '    <div class="channel-name-v" style="opacity:' + (isHidden ? '0.5' : '1') + ';">' +
                '      <div style="display:flex; justify-content:space-between; align-items:center;">' +
                '        <span class="ch-title">' + (s.name || s.handle) + '</span>' +
                '        <span style="font-size:9px; color:' + statusColor + ';">' + (isHidden ? 'مخفي' : statusText) + '</span>' +
                '      </div>' +
                '      <span class="ch-handle">' + s.handle.toUpperCase() + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="ch-status-icon" style="display:flex; gap:10px; align-items:center;">' +
                '    <button class="vis-toggle-btn" onclick="BreakingNewsWidget.toggleVisibility(\'' + s.handle + '\')" style="background:none; border:none; cursor:pointer; color:#888; padding:5px;">' + (isHidden ? '👁️‍🗨️' : '👁️') + '</button>' +
                (isSelected ? '<span class="ch-check">✓</span>' : '<span class="ch-remove-icon" style="color:var(--danger); cursor:pointer;" onclick="BreakingNewsWidget.removeSource(' + (i - hardcoded.length) + ')">✕</span>') +
                '  </div>' +
                '</div>';
        });
        grid.innerHTML = html;
    }

    async function loadNews(force) {
        var container = document.getElementById('breaking-news-body') || document.getElementById('news-list');
        if (!container) return;

        // 1. Initial Load from LocalStorage (Instant UI)
        if (isFirstLoad) {
            var cached = localStorage.getItem('rasmirqab_bn_cache');
            if (cached) {
                try {
                    var items = JSON.parse(cached);
                    localCache = items;
                    renderItems(container, items);
                } catch(e) {}
            }
            // Try server-side cache
            fetchServerCache();
        }

        if (localCache.length === 0 && isFirstLoad) {
            container.innerHTML = 
                '<div class="loading-state-v12" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:50px; color:#e67e22;">' +
                '  <i class="fas fa-circle-notch fa-spin" style="font-size:32px; margin-bottom:15px;"></i>' +
                '  <div style="font-family:var(--font-ar); font-size:14px; font-weight:700;">جاري تحديث الأخبار العالمية...</div>' +
                '</div>';
            return;
        }

        await fetchServerCache();
        checkProxyStatus();
    }

    async function fetchServerCache(force) {
        if (force) {
            var container = document.getElementById('news-list') || document.getElementById('breaking-news-body');
            if (container) {
                container.innerHTML = 
                    '<div class="loading-state-v12" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:50px; color:#e67e22;">' +
                    '  <i class="fas fa-circle-notch fa-spin" style="font-size:32px; margin-bottom:15px;"></i>' +
                    '  <div style="font-family:var(--font-ar); font-size:14px; font-weight:700;">جاري جلب آخر الأخبار...</div>' +
                    '</div>';
            }
        }
        console.log('--- NEWS-ENGINE: ATTEMPTING CACHE SYNC ---');
        // V71.4: Multi-Source Sync with API Fallback
        const origin = window.location.origin || '';
        const paths = [
            'https://ras-mirqab-production.up.railway.app/api/news',
            'https://ras-mirqab-production.up.railway.app/news.json',
            origin + '/news.json',
            'news.json'
        ];
        for (let path of paths) {
            try {
                const res = await fetch(path + '?nocache=' + Date.now(), { cache: 'no-store' });
                console.log(`--- [${VERSION}] FETCH ${path} -> STATUS: ${res.status}`);
                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (data.items || []);
                    console.log(`--- [${VERSION}] DATA RECV:`, data.engine || 'NO-ENGINE', 'ITEMS:', items.length);
                    if (items && items.length > 0) {
                        console.log('--- NEWS-ENGINE: SYNC SUCCESS FROM:', path, 'ITEMS:', items.length);
                        
                        // Only update if the content has changed or we are forced
                        const firstItemLink = items[0].link + items[0].title;
                        const cachedFirstItemLink = localCache[0] ? (localCache[0].link + localCache[0].title) : '';
                        
                        if (!force && firstItemLink === cachedFirstItemLink && localCache.length > 0) {
                            console.log('--- NEWS-ENGINE: NO NEW DATA, SKIPPING RENDER ---');
                            return;
                        }

                        const newItems = items.filter(it => !seenIds.has((it.link || '') + (it.title || '').substring(0,20)));
                        if (!isFirstLoad && newItems.length > 0) {
                            newItems.forEach(it => it.isNew = true);
                        }
                        items.forEach(it => seenIds.add((it.link || '') + (it.title || '').substring(0,20)));
                        isFirstLoad = false;
                        localCache = items;
                        localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(localCache));
                        
                        var container = document.getElementById('news-list') || document.getElementById('breaking-news-body');
                        if (container) {
                             const displayItems = (window.innerWidth <= 768) ? localCache.slice(0, 30) : localCache;
                             if (window.BreakingNewsWidget && window.BreakingNewsWidget.renderOverride) {
                                 window.BreakingNewsWidget.renderOverride(container, displayItems);
                             } else if (window.mobileRenderNews) {
                                 window.mobileRenderNews(displayItems);
                             } else {
                                 renderItems(container, displayItems);
                             }
                        }
                        return;
                    }
                }
            } catch(e) {
                console.warn('--- NEWS-ENGINE: PATH FAILED:', path);
            }
        }
    }

    function rotateMirror() {
        // Obsolete but kept for UI compatibility
        var btn = document.getElementById('bn-refresh-btn');
        if (btn) {
            btn.classList.add('loading');
            setTimeout(() => {
                btn.classList.remove('loading');
                loadNews();
            }, 1000);
        }
    }

    function renderItems(container, items) {
        container.innerHTML = '';
        var AVATARS = {
            // ─ Telegram sources ─
            'alrougui':              'public/logos/alrougui.jpg',
            'alekhbariyanews':       'public/logos/alekhbariyanews.jpg',
            'alekhbariyabrk':        'public/logos/alekhbariyabrk.jpg',
            'alekhbariyaBRK':        'public/logos/alekhbariyabrk.jpg',
            'newsnow4usa':           'public/logos/newsnow4usa.jpg',
            'modgovksa':             'public/logos/modgovksa.jpg',
            'asharqnewsbrk':         'public/logos/asharqnewsbrk.jpg',
            'alhadath':              'public/logos/alhadath.jpg',
            'alhadath_brk':          'public/logos/alhadath.jpg',
            'alarabiya_brk':         'public/logos/alarabiya_brk.jpg',
            'alarabiya':             'public/logos/alarabiya.png',
            'skynewsarabia_b':       'public/logos/skynewsarabia_b.jpg',
            'skynewsarabia_breaking':'public/logos/skynewsarabia_b.jpg',
            'skynews_ar':            'public/logos/skynewsarabia_b.jpg',
            'rt_arabic':             'public/logos/rt.png',
            'rtonline_ar':           'public/logos/rt.png',
            'arareuters':            'https://www.reuters.com/pf/resources/images/reuters/favicon.ico',
            'sabq_news':             'public/logos/kbsalsaud.png',
            'ajelnews24':            'public/logos/ajelnews.jpg',
            'ajanews':               'public/logos/ajanews_new.png',
            'ajmubasher':            'public/logos/ajmubasher.jpg',
            // ─ Twitter/X sources — show Twitter bird or channel logo ─
            'rss-app':               'public/logos/aljazeera.png', 
            'twitter-list':          'public/logos/alarabiya.png',
            'alekhbariyaNews':       'public/logos/alekhbariyanews.jpg',
            'skyNewsArabia_B':       'public/logos/skynewsarabia_b.jpg',
            'AJELNEWS2475':          'public/logos/ajelnews2475.jpg',
            // ─ RSS fallbacks ─
            'alhadath2':             'public/logos/alhadath.jpg',
            'aljazeera':             'public/logos/aljazeera.png',
        };

        items.forEach(function (item) {
            var handle = item.sourceHandle || '';
            var source = item.source || 'rss';
            
            // Try to find avatar: 1. Item-specific (from backend V61.4), 2. Mapping by handle (lower case), 3. Default
            var avatar = item.avatarUrl || item.customAvatar || AVATARS[handle] || AVATARS[handle.toLowerCase()] || 'public/logos/default.png';
            
            // Platform Badge
            const badgeIcon = source === 'twitter' ? '<i class="fa-brands fa-x-twitter" style="font-size:8px;"></i>' : (source === 'telegram' ? '<i class="fa-brands fa-telegram" style="font-size:10px;"></i>' : '<i class="fas fa-rss" style="font-size:8px;"></i>');
            const badgeColor = source === 'twitter' ? '#fff' : (source === 'telegram' ? '#0088cc' : '#e67e22');

            var timeStr = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            var relativeTime = getArabicRelativeTime(item.pubDate);
            
            // Pulsing Glow Check (< 9 seconds old)
            var pubTime = new Date(item.pubDate).getTime();
            var nowTime = Date.now();
            var isFresh = (nowTime - pubTime) < 9000;

            var itemEl = document.createElement('div');
            itemEl.className = 'news-item' + (item.isNew ? ' news-item-new' : '') + (isFresh ? ' v12-pulse-glow' : '');
            itemEl.style = 'padding:0; margin-bottom:12px; cursor:pointer; display:flex; transition: transform 0.2s;';
            itemEl.onclick = function () { window.open(item.link, '_blank'); };

            var media = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);

            itemEl.innerHTML =
                '  <div class="item-v12-inner-ref">' +
                '    <div class="v12-col-left">' +
                '      <div class="v12-thumbnail">' +
                (media ? '<img src="' + media + '" class="v12-media-img" onerror="this.src=\'' + avatar + '\'; this.className=\'v12-media-fallback\'">' : 
                         '<img src="' + avatar + '" class="v12-media-fallback">') +
                '      </div>' +
                '    </div>' +
                '    <div class="v12-col-center">' +
                '      <div class="v12-title-text">' + (item.title || '') + '</div>' +
                '    </div>' +
                '    <div class="v12-col-right">' +
                '      <div class="v12-source-logo-container">' +
                '        <img src="' + avatar + '" class="v12-circle-logo" onerror="this.src=\'public/logos/default.png\'">' +
                '        <div class="v12-platform-overlap ' + source + '">' + badgeIcon + '</div>' +
                '      </div>' +
                '      <div class="v12-source-name-ref">' + 
                           (item.sourceName || handle).substring(0, 15) + 
                       '</div>' +
                '      <div class="v12-time-ref">' + relativeTime + '</div>' +
                '    </div>' +
                '  </div>';


            itemEl.addEventListener('mouseenter', function (e) {
                if (!hoverEnabled || !popupEl) return;
                var rect = itemEl.getBoundingClientRect();
                var media = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);
                
                // Construct Popup Content: Media first, then text
                var imgHtml = media ? '<img src="' + media + '" class="bn-popup-image has-img" style="width:100%; border-radius:8px; margin-bottom:12px; border:1px solid #333;" />' : '';

                popupEl.innerHTML =
                    '<div class="bn-popup-live-header">' +
                    '  <span>BREAKING LIVE 🚨</span>' +
                    '</div>' +
                    '<div class="bn-popup-media-frame">' +
                    (media ? '<img src="' + media + '" class="bn-popup-media-content" />' : 
                             '<img src="' + avatar + '" class="bn-popup-media-content" style="padding:20%; opacity:0.3;" />') +
                    '  <div class="bn-popup-media-bottom-bar"></div>' +
                    '</div>' +
                    '<div class="bn-popup-body">' +
                    '  <div class="bn-popup-title">' + (item.title || '') + '</div>' +
                    '</div>' +
                    '<div class="bn-popup-footer">' +
                    '  <span class="bn-popup-source">SOURCE: ' + (item.sourceName || source) + '</span>' +
                    '  <span class="bn-popup-footer-time">' + relativeTime + '</span>' +
                    '</div>';

                popupEl.classList.add('active');
                var pW = popupEl.offsetWidth || 380;
                var pH = popupEl.offsetHeight || 200;
                
                // Position logic (Premium)
                var left = rect.left - pW - 25;
                if (left < 20) left = rect.right + 25;
                
                var top = rect.top + (rect.height / 2) - (pH / 2);
                if (top < 20) top = 20;
                if (top + pH > window.innerHeight - 20) top = window.innerHeight - pH - 20;

                popupEl.style.left = left + 'px';
                popupEl.style.top = top + 'px';
            });

            itemEl.addEventListener('mouseleave', function () {
                if (popupEl) popupEl.classList.remove('active');
            });

            container.appendChild(itemEl);
        });
    }

    return { 
        render: render, 
        init: init, 
        renderItems: renderItems, // V28: Exposed for mobile override
        removeSource: removeSource, 
        toggleSettings: toggleSettings, 
        toggleVisibility: toggleVisibility,
        fetchServerCache: fetchServerCache,
        getArabicRelativeTime: getArabicRelativeTime
    };
})();
