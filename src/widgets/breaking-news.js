/* ═══════════════════════════════════════════════
   BREAKING NEWS WIDGET (عاجل)
   ═══════════════════════════════════════════════ */

var BreakingNewsWidget = (function () {
    var STORAGE_KEY = 'rasmirqab_custom_sources';
    var PROXY_BASE = localStorage.getItem('rasmirqab_proxy') || 'http://localhost:3001';
    var hoverEnabled = localStorage.getItem('rasmirqab_bn_hover') !== 'false';
    var popupEl = null;
    var refreshTimer = null;
    var seenIds = new Set();
    var isFirstLoad = true;
    var settingsOpen = false;
    var localCache = [];
    var consecutiveFailures = 0;
    var isProxyLive = true;
    var sourceStatusMap = {};
    var sourceDiagnostics = {}; // Stores { handle: timestamp }
    var hiddenSources = new Set(JSON.parse(localStorage.getItem('rasmirqab_hidden_sources') || '[]'));
    var currentMirrorIndex = 0;
    var NITTER_MIRRORS = [
        'https://ras-mirqab.onrender.com', // Primary
        'https://nitter.net',
        'https://nitter.cz',
        'https://nitter.it',
        'https://nitter.privacydev.net',
        'https://nitter.dafrary.com'
    ];

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
                '  <div class="breaking-top-layer">' +
                '    <div class="breaking-integrated-controls">' +
                '      <button class="integrated-sync-btn" id="bn-refresh-btn-v12">' +
                '        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 22v-6h6"/><path d="M21 12c0 4.97-4.03 9-9 9a9 9 0 0 1-9-9M3 12c0-4.97 4.03-9 9-9a9 9 0 0 1 9 9"/></svg>' +
                '        <span>hard sync</span>' +
                '      </button>' +
                '      <button class="widget-action-btn" id="bn-gear-btn" title="إعدادات المصادر">⚙️</button>' +
                '    </div>' +
                '    <div class="breaking-title-wrap">' +
                '      <div class="dropdown-arrow-wrap"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#e9a35e" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></div>' +
                '      <span class="breaking-main-title">الأخبار العاجلة</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="breaking-glow-header">' +
                '    <div class="glow-title-flex">' +
                '      <span class="glow-text-title">عاجل</span>' +
                '      <div class="glow-active-dot"></div>' +
                '    </div>' +
                '  </div>' +
                '</div>',
            body:
                '<div class="widget-body" id="breaking-news-body" style="padding:0;">' +
                '  <div style="color:#666; text-align:center; padding:40px; font-size:12px;">جاري الاتصال...</div>' +
                '</div>',
        };
    }

    function init() {
        var gearBtn = document.getElementById('bn-gear-btn');
        if (gearBtn) gearBtn.addEventListener('click', toggleSettings);

        var refreshBtn = document.getElementById('bn-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', function () {
            rotateMirror();
            loadNews(true);
        });

        var refreshBtnV12 = document.getElementById('bn-refresh-btn-v12');
        if (refreshBtnV12) refreshBtnV12.addEventListener('click', function () {
            rotateMirror();
            loadNews(true);
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
        fetchDiagnostics();

        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(function() {
            loadNews();
            fetchDiagnostics();
        }, 30000); 

        checkProxyStatus();

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

    function checkProxyStatus() {
        fetch(PROXY_BASE + '/health')
            .then(function () {
                isProxyLive = true;
                consecutiveFailures = 0;
                var dot = document.getElementById('bn-live-dot');
                if (dot) dot.style.background = '#2ecc71';
            })
            .catch(function () {
                consecutiveFailures++;
                if (consecutiveFailures > 3) {
                    isProxyLive = false;
                    var dot = document.getElementById('bn-live-dot');
                    if (dot) dot.style.background = '#e74c3c';
                }
            });
    }

    async function fetchDiagnostics() {
        try {
            const res = await fetch(PROXY_BASE + '/api/news-diagnostics');
            if (!res.ok) return;
            const data = await res.json();
            sourceDiagnostics = data.sourceHealth || {};
            renderSourceList();
        } catch (e) {
            console.error("Diagnostics fetch failed", e);
        }
    }

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
            { type: 'twitter', handle: 'alekhbariyaNews', name: 'الإخبارية / alekhbariya', avatar: 'public/logos/alekhbariya.jpg', fixed: true },
            { type: 'twitter', handle: 'alekhbariyabrk', name: 'الإخبارية - عاجل', avatar: 'public/logos/alekhbariya.jpg', fixed: true },
            { type: 'twitter', handle: 'NewsNow4USA', name: 'News Now 4 USA', avatar: 'public/logos/newsnow.jpg', fixed: true },
            { type: 'twitter', handle: 'modgovksa', name: 'MoD KSA / الدفاع', avatar: 'public/logos/modgovksa2.png', fixed: true },
            { type: 'twitter', handle: 'AsharqNewsBrk', name: 'Asharq News / الشرق', avatar: 'public/logos/asharq2.jpg', fixed: true },
            { type: 'twitter', handle: 'AlHadath', name: 'Al Hadath / الحدث', avatar: 'public/logos/alhadath3.png', fixed: true },
            { type: 'twitter', handle: 'alarabiya_brk', name: 'العربية عاجل (𝕏)', avatar: 'public/logos/alarabiya.png', fixed: true },
            { type: 'twitter', handle: 'skynewsarabia_B', name: 'سكاي نيوز عاجل (𝕏)', avatar: 'public/logos/skynews.png', fixed: true },
            { type: 'twitter', handle: 'ajmubasher', name: 'الجزيرة مباشر', avatar: 'public/logos/aljazeera.png', fixed: true },
            { type: 'twitter', handle: 'RTonline_ar', name: 'RT العربية (𝕏)', avatar: 'public/logos/rt.png', fixed: true },
            { type: 'telegram', handle: 'SABQ_NEWS', name: 'صحيفة سبق', avatar: 'public/logos/sabq.png', fixed: true },
            { type: 'telegram', handle: 'AjelNews24', name: 'عاجل السعودية', avatar: 'public/logos/ajelnews.jpg', fixed: true },
            { type: 'telegram', handle: 'Alarabiya_brk', name: 'العربية عاجل', avatar: 'public/logos/alarabiya.png', fixed: true },
            { type: 'telegram', handle: 'SkyNewsArabia_Breaking', name: 'سكاي نيوز عاجل', avatar: 'public/logos/skynews.png', fixed: true },
            { type: 'telegram', handle: 'RT_Arabic', name: 'RT العربية', avatar: 'public/logos/rt.png', fixed: true },
            { type: 'telegram', handle: 'ajanews', name: 'Al Jazeera / الجزيرة', avatar: 'public/logos/aljazeera.png', fixed: true },
            { type: 'rss', handle: 'i24news-ar', name: 'اعلام الاحتلال الاسرائيلي', url: 'https://www.i24news.tv/ar/feed', avatar: 'https://www.i24news.tv/favicon.ico', fixed: true },
            { type: 'rss', handle: 'sabq-org', name: 'صحيفة سبق (موقع)', url: 'https://sabq.org/rss.xml', avatar: 'https://sabq.org/favicon.ico', fixed: true }
        ];
        var all = hardcoded.concat(sources);
        var html = '';
        all.forEach(function (s, i) {
            var lastSeen = sourceDiagnostics[s.handle] || 0;
            var diffMin = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null;
            
            var statusColor = '#888';
            var statusText = 'انتظار';
            
            if (s.type === 'telegram') {
                statusColor = '#2ecc71';
                statusText = 'مباشر (Telegram)';
            } else if (lastSeen) {
                if (diffMin < 30) { statusColor = '#2ecc71'; statusText = 'نشط (' + diffMin + 'د)'; }
                else if (diffMin < 120) { statusColor = '#f1c40f'; statusText = 'خامل (' + diffMin + 'د)'; }
                else { statusColor = '#e74c3c'; statusText = 'منقطع'; }
            }

            var isSelected = s.fixed;
            var isHidden = hiddenSources.has(s.handle);
            var color = s.type === 'twitter' ? '#1DA1F2' : '#0088cc';
            var icon = s.type === 'twitter' ? '𝕏' : '📱';

            html +=
                '<div class="channel-card ' + (isSelected ? 'selected' : '') + ' ' + (isHidden ? 'hidden-source' : '') + '" style="cursor:pointer; transition:all 0.3s ease; border:1px solid ' + (isHidden ? 'transparent' : 'var(--accent-dim)') + '; background:' + (isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,106,0,0.05)') + ';" onclick="BreakingNewsWidget.toggleVisibility(\'' + s.handle + '\')">' +
                '  <div class="channel-card-info">' +
                '    <div class="channel-avatar" style="position:relative; overflow:hidden; border-radius:8px; border:1px solid ' + (isHidden ? '#333' : 'var(--accent)') + '; filter:' + (isHidden ? 'grayscale(100%)' : 'none') + '; opacity:' + (isHidden ? '0.4' : '1') + ';">' +
                '      <img src="' + (s.avatar || 'public/logos/default.png') + '" style="width:100%; height:100%; object-fit:cover;">' +
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
        var container = document.getElementById('breaking-news-body');
        if (!container) return;

        // NEW: Load from localStorage cache immediately (Fast Loading)
        if (isFirstLoad) {
            var cached = localStorage.getItem('rasmirqab_bn_cache');
            if (cached) {
                try {
                    var items = JSON.parse(cached);
                    localCache = items;
                    renderItems(container, items);
                    // Don't set isFirstLoad = false yet, so the notification logic works on the real fetch
                } catch(e) {}
            }
        }

        var items = await fetchAllFeeds();
        if (!items || items.length === 0) {
            if (isFirstLoad && localCache.length === 0) {
                container.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">جاري تحديث البيانات...</div>';
            }
            return;
        }

        // NEW: Save to localStorage for next time
        localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(items));

        // V11.2: Limit to top 4 for mobile precisely
        if (window.innerWidth <= 768) {
            items = items.slice(0, 4);
        }

        localCache = items;

        var newCount = 0;
        items.forEach(function (item) {
            var id = item.link + (item.title ? item.title.substring(0, 20) : item.pubDate);
            if (!seenIds.has(id)) {
                if (!isFirstLoad) { 
                    newCount++; 
                    item.isNew = true; 
                }
                seenIds.add(id);
            }
        });

        if (newCount > 0 && window.RasMirqabNotification) {
            RasMirqabNotification.show('تحديث عاجل', 'تم رصد ' + newCount + ' أخبار جديدة');
        }

        isFirstLoad = false;
        renderItems(container, items);
        checkProxyStatus();
    }

    async function fetchAllFeeds() {
        try {
            const res = await fetch(PROXY_BASE + '/api/news-v4-list');
            if (!res.ok) return [];
            const data = await res.json();
            return data.items || [];
        } catch (e) {
            console.error("Cache fetch failed:", e);
            return [];
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
            'alrougui': 'public/logos/alrougui.jpg',
            'alekhbariyaNews': 'public/logos/alekhbariya.jpg',
            'NewsNow4USA': 'public/logos/newsnow.jpg',
            'modgovksa': 'public/logos/modgovksa2.png',
            'AsharqNewsBrk': 'public/logos/asharq2.jpg',
            'AlHadath': 'public/logos/alhadath3.png',
            'AlArabiya_Brk': 'public/logos/alarabiya.png',
            'SkyNewsArabia_B': 'public/logos/skynews.png',
            'RTonline_ar': 'public/logos/rt.png',
            'araReuters': 'https://www.reuters.com/pf/resources/images/reuters/favicon.ico',
            'SABQ_NEWS': 'public/logos/sabq.png',
            'AjelNews24': 'public/logos/ajelnews.jpg',
            'SkyNewsArabia_Breaking': 'public/logos/skynews.png',
            'RT_Arabic': 'public/logos/rt.png',
            'ajanews': 'public/logos/aljazeera.png',
            'i24news-ar': 'public/logos/i24news.png',
            'sabq-org': 'public/logos/sabq.png'
        };

        items.forEach(function (item) {
            var handle = item.sourceHandle || '';
            var source = item.source || 'rss';
            
            // Try to find avatar: 1. Item-specific, 2. Mapping by handle (lower case), 3. Default
            var avatar = item.customAvatar || AVATARS[handle] || AVATARS[handle.toLowerCase()] || 'public/logos/default.png';
            
            // Platform Badge
            var badgeIcon = source === 'twitter' ? '𝕏' : (source === 'telegram' ? '📱' : '🌐');
            var badgeColor = source === 'twitter' ? '#fff' : (source === 'telegram' ? '#0088cc' : '#f1c40f');

            var timeStr = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

            var itemEl = document.createElement('div');
            itemEl.className = 'news-item' + (item.isNew ? ' news-item-new' : '');
            itemEl.style = 'padding:0; margin-bottom:8px; cursor:pointer; display:flex; transition: transform 0.2s;';
            itemEl.onclick = function () { window.open(item.link, '_blank'); };

            var media = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);

            itemEl.innerHTML =
                '  <div class="item-v12-inner">' +
                '    <div class="item-v12-left">' +
                '      <div class="v12-thumb-wrap">' +
                (media ? '<img src="' + media + '" class="v12-thumb-img">' : 
                         '<div class="v12-thumb-placeholder"><img src="' + avatar + '" style="opacity:0.8; width:70%; filter: grayscale(0.5) contrast(1.2);"></div>') +
                '      </div>' +
                '    </div>' +
                '    <div class="item-v12-right">' +
                '      <div class="v12-news-title">' + (item.title || '') + '</div>' +
                '      <div class="v12-meta-row">' +
                '        <div class="v12-time">' + (item.isNew ? '<span class="v12-new-badge">جديد</span> ' : '') + timeStr + ' ' + (item.relativeTime || 'قبل قليل') + '</div>' +
                '        <div class="v12-source-info">' +
                '          <span class="v12-source-name">' + (item.sourceName || handle) + '</span>' +
                '          <div class="v12-source-logo-wrap">' +
                '            <img src="' + avatar + '" class="v12-source-logo">' +
                '            <div class="v12-platform-badge ' + source + '">' + badgeIcon + '</div>' +
                '          </div>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +
                '  </div>';


            itemEl.addEventListener('mouseenter', function (e) {
                if (!hoverEnabled || !popupEl) return;
                var rect = itemEl.getBoundingClientRect();
                var media = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);
                
                // Construct Popup Content: Media first, then text
                var imgHtml = media ? '<img src="' + media + '" class="bn-popup-image has-img" style="width:100%; border-radius:8px; margin-bottom:12px; border:1px solid #333;" />' : '';

                popupEl.innerHTML =
                    '<div class="bn-popup-header" style="color:#e67e22; font-weight:800; font-size:12px; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">' +
                    '  <span>🚨 معاينة الخبر العاجل</span>' +
                    '  <span style="font-size:10px; color:#666;">' + (item.sourceName || source) + '</span>' +
                    '</div>' +
                    imgHtml +
                    '<div class="bn-popup-text" style="font-size:14px; line-height:1.6; color:#fff; font-weight:500;">' + (item.title || item.text || '') + '</div>' +
                    '<div class="bn-popup-meta" style="margin-top:12px; font-size:11px; color:#888; display:flex; justify-content:space-between; border-top:1px solid #222; padding-top:8px;">' +
                    '  <span>المصدر: ' + (item.customName || item.sourceName || item.source) + '</span>' +
                    '  <span>الوقت: ' + timeStr + '</span>' +
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

    return { render: render, init: init, removeSource: removeSource, toggleSettings: toggleSettings, toggleVisibility: toggleVisibility };
})();
