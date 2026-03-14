/* ═══════════════════════════════════════════════
   BREAKING NEWS WIDGET (عاجل)
   ═══════════════════════════════════════════════ */

var BreakingNewsWidget = (function () {
    var STORAGE_KEY = 'rasmirqab_custom_sources';
    var PROXY_BASE = 'http://' + (window.location.hostname || 'localhost') + ':3001';
    var isProxyLive = false;
    var refreshTimer = null;
    var seenIds = new Set();
    var isFirstLoad = true;
    var settingsOpen = false;
    var toggledTimes = new Set();
    var lastFetchedItems = [];

    function getSources() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveSources(arr) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    function timeAgoAr(dateStr) {
        var diff = Date.now() - new Date(dateStr);
        var s = Math.floor(diff / 1000);
        if (s < 1) return 'الآن';
        if (s < 60) return 'قبل ' + s + ' ثانية';
        var m = Math.floor(s / 60);
        if (m === 1) return 'قبل دقيقة';
        if (m < 11) return 'قبل ' + m + ' دقائق';
        if (m < 60) return 'قبل ' + m + ' دقيقة';
        var h = Math.floor(m / 60);
        if (h === 1) return 'قبل ساعة';
        if (h < 11) return 'قبل ' + h + ' ساعات';
        if (h < 24) return 'قبل ' + h + ' ساعة';
        var d = Math.floor(h / 24);
        if (d === 1) return 'قبل يوم';
        return 'قبل ' + d + ' أيام';
    }

    function render() {
        return {
            header:
                '<div class="widget-header breaking-header">' +
                '  <div class="widget-title">' +
                '    <span class="live-dot" id="bn-live-dot"></span>' +
                '    <span class="breaking-title-text" id="bn-status-text">عاجل</span>' +
                '    <span class="widget-badge badge-live">NEW</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <span id="bn-debug-info" style="font-size:7px; color:#555; margin-right:5px; opacity:0.5; font-family:monospace; display:none;"></span>' +
                '    <button class="widget-action-btn" id="bn-refresh-btn" title="تحديث">↻</button>' +
                '    <button class="widget-action-btn" id="bn-gear-btn" title="إضافة مصادر" style="font-size:14px;">⚙</button>' +
                '  </div>' +
                '</div>',
            body:
                '  <div style="font-size:12px; color:#e67e22; font-weight:700; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:5px; display:flex; justify-content:space-between;">' +
                '    <span>إدارة المصادر / MANAGE SOURCES</span>' +
                '    <span style="cursor:pointer;" onclick="BreakingNewsWidget.toggleSettings()">✕</span>' +
                '  </div>' +

                '  <div style="font-size:12px; color:#e67e22; font-weight:700; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">مصادر إضافية / SOURCES</div>' +
                '  <div style="font-size:10px; color:#666; margin-bottom:6px; text-align:right;">أدخل رابط X أو تليجرام + Enter ↵</div>' +
                '  <input type="text" id="bn-add-source" placeholder="إضافة رابط جديد..." ' +
                '    style="width:100%; padding:7px 10px; border-radius:6px; border:1px solid #444; background:#000; color:#fff; font-size:12px; direction:ltr; box-sizing:border-box;" />' +
                '  <div id="bn-source-list" style="margin-top:8px; max-height:100px; overflow-y:auto; border-top:1px solid #222; padding-top:5px;"></div>' +
                '</div>' +
                '<div class="widget-body" id="breaking-news-body" style="scroll-behavior:smooth;">' +
                '  <div style="color:#888; text-align:center; padding:40px; font-size:12px;">جاري الاتصال بمحرك الرصد...</div>' +
                '</div>',
        };
    }

    async function init() {

        var gearBtn = document.getElementById('bn-gear-btn');
        if (gearBtn) gearBtn.addEventListener('click', function () {
            if (window.RasMirqabModal) window.RasMirqabModal.open('bn-settings-modal');
        });

        // Modal Specific Listeners
        var modalAddBtn = document.getElementById('bn-modal-btn-add');
        var modalInput = document.getElementById('bn-modal-add-source');
        if (modalAddBtn && modalInput) {
            modalAddBtn.addEventListener('click', function () {
                addSource(modalInput.value.trim());
                modalInput.value = '';
            });
            modalInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    addSource(modalInput.value.trim());
                    modalInput.value = '';
                }
            });
        }

        var refreshBtn = document.getElementById('bn-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', function () { loadNews(true); });

        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(updateTimeLabels, 1000);

        // Use a single robust news fetch interval (30s)
        setInterval(loadNews, 30000);

        await checkProxyStatus();
        loadNews(); // First load after proxy check
    }

    async function checkProxyStatus() {
        var dot = document.getElementById('bn-live-dot');
        var debugEl = document.getElementById('bn-debug-info');

        try {
            const currentHost = window.location.hostname || 'localhost';
            const localRes = await fetch(`http://${currentHost}:3001/health`).catch(() => null);

            if (localRes && localRes.ok) {
                PROXY_BASE = `http://${currentHost}:3001`;
                isProxyLive = true;
                console.log(`[BN] ✅ Proxy Connected: ${PROXY_BASE}`);
            } else if (currentHost !== 'localhost') {
                const fallbackRes = await fetch('http://localhost:3001/health').catch(() => null);
                if (fallbackRes && fallbackRes.ok) {
                    PROXY_BASE = 'http://localhost:3001';
                    isProxyLive = true;
                } else {
                    isProxyLive = false;
                }
            } else {
                isProxyLive = false;
            }
        } catch (e) {
            isProxyLive = false;
            console.error('[BN] Proxy check failed:', e);
            if (debugEl) {
                debugEl.style.display = 'inline';
                debugEl.style.color = '#e74c3c';
                var cleanBase = PROXY_BASE.replace('http://', '');
                debugEl.textContent = 'OFFLINE (' + cleanBase + ')';
                console.error('[BN] Proxy Status Check Failed:', e);
            }
        }

        if (dot) dot.style.background = isProxyLive ? '#2ecc71' : '#e74c3c';
        if (debugEl) {
            debugEl.style.display = 'inline';
            if (isProxyLive) {
                debugEl.style.color = '#555';
                debugEl.textContent = 'LINK OK';
            } else if (!debugEl.textContent.startsWith('ERR')) {
                debugEl.textContent = 'OFFLINE: ' + PROXY_BASE.replace('http://', '');
            }
        }
    }

    function renderModalSourceList() {
        var container = document.getElementById('bn-modal-source-list');

        if (!container) return;
        var sources = getSources();
        var hardcoded = [
            { type: 'telegram', handle: 'ajanews', fixed: true },
            { type: 'telegram', handle: 'alhadath_brk', fixed: true },
            { type: 'twitter', handle: 'X List: RasMirqab', fixed: true }
        ];
        var all = hardcoded.concat(sources);
        var html = '';
        all.forEach(function (s, i) {
            var icon = s.type === 'twitter' ? '𝕏' : '📱';
            var color = s.type === 'twitter' ? '#ffffff' : '#24a1de';
            var btn = s.fixed ? '<span style="font-size:10px; color:#555;">(رسمي)</span>' :
                '<button onclick="BreakingNewsWidget.removeSource(' + (i - hardcoded.length) + ')" style="background:rgba(231,76,60,0.1); border:1px solid rgba(231,76,60,0.2); color:#ff4d4d; border-radius:4px; padding:2px 8px; cursor:pointer; font-size:10px;">حذف (DEL)</button>';

            html += '<div class="channel-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">' +
                '<div style="display:flex; align-items:center; gap:10px;">' +
                '<span style="color:' + color + '; font-size:14px;">' + icon + '</span>' +
                '<div>' +
                '<div style="font-size:12px; font-weight:700; color:#fff;">' + s.handle + '</div>' +
                '<div style="font-size:9px; color:#666; text-transform:uppercase;">' + s.type + '</div>' +
                '</div>' +
                '</div>' +
                btn + '</div>';
        });
        container.innerHTML = html || '<div style="color:#444; text-align:center; padding:20px; font-size:12px;">لم يتم إضافة مصادر مخصصة بعد.</div>';
    }

    async function loadNews() {
        var container = document.getElementById('breaking-news-body');
        if (!container) return;

        var items = await fetchAllFeeds();
        if (!items || items.length === 0) {
            if (isFirstLoad) container.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">لا توجد أخبار حالياً...</div>';
            return;
        }

        items.sort(function (a, b) {
            var da = new Date(a.pubDate).getTime();
            var db = new Date(b.pubDate).getTime();
            if (isNaN(da)) da = 0;
            if (isNaN(db)) db = 0;
            return db - da;
        });

        var newCount = 0;
        items.forEach(function (item) {
            var id = (item.link || '') + (item.title ? item.title.substring(0, 50) : item.pubDate);
            if (!seenIds.has(id)) {
                if (!isFirstLoad) { newCount++; item.isNew = true; }
                seenIds.add(id);
            }
        });

        if (newCount > 0 && window.RasMirqabNotification) {
            RasMirqabNotification.show('تحديث عاجل', 'تم رصد ' + newCount + ' أخبار جديدة');
        }

        isFirstLoad = false;

        // Smarter merging for the UI
        if (lastFetchedItems.length === 0) {
            lastFetchedItems = items;
        } else {
            // Updated merging logic: Replace items if they have new/better data
            var updatedItems = [...items];
            lastFetchedItems.forEach(function (oldItem) {
                var oldId = (oldItem.link || '') + (oldItem.title ? oldItem.title.substring(0, 50) : oldItem.pubDate);
                if (!updatedItems.some(function (ni) {
                    var newId = (ni.link || '') + (ni.title ? ni.title.substring(0, 50) : ni.pubDate);
                    return newId === oldId;
                })) {
                    updatedItems.push(oldItem);
                }
            });

            updatedItems.sort(function (a, b) {
                var da = new Date(a.pubDate);
                var db = new Date(b.pubDate);
                if (isNaN(da.getTime())) return 1;
                if (isNaN(db.getTime())) return -1;
                return db - da;
            });
            lastFetchedItems = updatedItems.slice(0, 120);
        }


        renderItems(container, lastFetchedItems);
        checkProxyStatus();
    }

    async function fetchAllFeeds() {
        try {
            const url = PROXY_BASE + '/news?t=' + Date.now();
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                return data.items || [];
            } else {
                console.warn('[BN] Proxy response not OK:', res.status);
            }
        } catch (e) {
            console.error('[BN] Proxy fetch failed:', e.message);
        }

        // Fallback to static cache if proxy fails
        try {
            const staticUrl = 'https://abadycodes07.github.io/ras-mirqab/public/data/news-live.json?t=' + Date.now();
            const staticRes = await fetch(staticUrl);
            if (staticRes.ok) {
                const staticData = await staticRes.json();
                return staticData.items || [];
            }
        } catch (e) { }

        return [];
    }

    function renderItems(container, items) {
        console.log('[BN] Rendering', items.length, 'items');

        container.innerHTML = '';
        console.log('[BN] Items for rendering:', items.filter(i => i.source === 'twitter').length, 'Twitter items found.');

        items.forEach(function (item) {
            try {
                var id = (item.link || '') + (item.title ? item.title.substring(0, 50) : item.pubDate);
                var isToggled = toggledTimes.has(id);
                var relativeTime = timeAgoAr(item.pubDate);
                var absoluteTime = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                var displayTime = isToggled ? absoluteTime : relativeTime;
                var highlightClass = item.isNew ? ' news-item-new' : '';

                // [SOURCE LOGO] Keep logos separate from media.
                var sourceLogo = item.customAvatar || (item.source === 'twitter' ? 'https://abadycodes07.github.io/ras-mirqab/public/logos/twitter_bg.png' : 'https://abadycodes07.github.io/ras-mirqab/public/logos/aljazeera.png');

                var itemEl = document.createElement('div');
                itemEl.className = 'news-item' + highlightClass;
                itemEl.setAttribute('data-id', id);

                // [DYNAMIC LAYOUT] Column for Media-Rich, Row for Text-Only
                var hasValidMedia = (item.hasMedia && item.mediaUrl && !item.mediaUrl.includes('placeholder') && !item.mediaUrl.includes('profile_images'));

                var baseStyle = 'padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; display:flex; direction:rtl; transition: background 0.2s;';
                if (hasValidMedia) {
                    itemEl.style = baseStyle + ' flex-direction:column; gap:10px;';
                } else {
                    itemEl.style = baseStyle + ' flex-direction:row; align-items:center; gap:12px;';
                }

                itemEl.onclick = function () { showDetailPopup(item); };
                itemEl.onmouseenter = function () { itemEl.style.background = 'rgba(255,255,255,0.04)'; };
                itemEl.onmouseleave = function () { itemEl.style.background = 'transparent'; };

                // [MEDIA EMBED] Full-width top or hidden
                var mediaHtml = '';
                if (hasValidMedia) {
                    var proxied = PROXY_BASE + '/image-proxy?url=' + encodeURIComponent(item.mediaUrl);
                    mediaHtml = '<div class="bn-embed-container" style="width:100%; height:160px; border-radius:10px; overflow:hidden; background:#111; border:1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 15px rgba(0,0,0,0.4); position:relative;">' +
                        '<img src="' + proxied + '" style="width:100%; height:100%; object-fit:cover; display:block;" ' +
                        'onerror="if(!this.dataset.triedDirect){ this.dataset.triedDirect=true; this.src=\'' + item.mediaUrl + '\'; } else { this.parentElement.style.display=\'none\'; }" />' +
                        (item.mediaType === 'video' ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:36px; height:36px; background:rgba(230,126,34,0.8); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#000; font-size:18px;">▶</div>' : '') +
                        '</div>';
                }

                // [CONTENT AREA]
                var contentHtml = '<div style="flex:1; direction:rtl; text-align:right;">' +
                    '<div style="font-size:13px; line-height:1.45; color:#fff; font-weight:500; margin-bottom:6px; max-height:2.9em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-family:\'Tajawal\', sans-serif;">' + (item.title || '') + '</div>' +
                    '<div style="display:flex; align-items:center; gap:8px; font-size:10px; color:#777; font-family:\'Inter\', sans-serif;">' +
                    '<span style="color:#e67e22; font-weight:600;">' + (item.customName || item.sourceName || '') + '</span>' +
                    '<span>•</span>' +
                    '<span class="time-label" data-date="' + item.pubDate + '">' + displayTime + '</span>' +
                    '</div>' + '</div>';


                var timeBtn = itemEl.querySelector('.news-item-time');
                if (timeBtn) {
                    timeBtn.onclick = function (e) {
                        e.stopPropagation();
                        if (toggledTimes.has(id)) toggledTimes.delete(id);
                        else toggledTimes.add(id);
                        updateTimeLabels();
                    };
                }

                container.appendChild(itemEl);
            } catch (err) {
                console.error('[BN] Failed to render news item:', err, item);
            }
        });
    }

    function showDetailPopup(item) {
        var modal = document.getElementById('bn-detail-modal');
        if (!modal) return;

        var sourceEl = document.getElementById('bn-detail-source');
        var mediaCont = document.getElementById('bn-detail-media');
        var titleEl = document.getElementById('bn-detail-title');
        var timeEl = document.getElementById('bn-detail-time');
        var linkEl = document.getElementById('bn-detail-link');

        if (sourceEl) sourceEl.textContent = (item.customName || item.sourceName || item.source).toUpperCase();
        if (titleEl) titleEl.innerHTML = (item.title || item.text || '').replace(/\n/g, '<br>');
        if (timeEl) timeEl.textContent = new Date(item.pubDate).toLocaleString('ar-SA');
        if (linkEl) linkEl.href = item.link;

        if (mediaCont) {
            mediaCont.innerHTML = '';
            var mediaUrl = item.mediaUrl || item.localMedia || item.image;
            var hasValidMedia = mediaUrl && !mediaUrl.includes('placeholder') && !mediaUrl.includes('profile_images');

            if (hasValidMedia && mediaUrl.startsWith('http')) {
                var proxied = PROXY_BASE + '/image-proxy?url=' + encodeURIComponent(mediaUrl);
                mediaCont.style.display = 'block';

                if (item.mediaType === 'video') {
                    var video = document.createElement('video');
                    video.controls = true;
                    video.autoplay = true;
                    video.style.width = '100%';
                    video.style.display = 'block';
                    var source = document.createElement('source');
                    source.src = proxied;
                    source.type = 'video/mp4';
                    video.appendChild(source);

                    // Fallback to original if proxied fails
                    video.onerror = function () { source.src = mediaUrl; video.load(); };
                    mediaCont.appendChild(video);
                } else {
                    var img = document.createElement('img');
                    img.src = proxied;
                    img.style.width = '100%';
                    img.style.display = 'block';
                    img.onerror = function () {
                        if (!img.dataset.triedDirect) {
                            img.dataset.triedDirect = true;
                            img.src = mediaUrl;
                        } else {
                            mediaCont.style.display = 'none';
                        }
                    };
                    mediaCont.appendChild(img);
                }
            } else {
                mediaCont.style.display = 'none';
            }
        }

        if (window.RasMirqabModal) {
            window.RasMirqabModal.open('bn-detail-modal');
        } else {
            modal.classList.remove('hidden');
        }
    }

    function toggleSettings() {
        var panel = document.getElementById('bn-settings-panel');
        if (panel) {
            settingsOpen = !settingsOpen;
            panel.style.display = settingsOpen ? 'block' : 'none';
            if (settingsOpen) renderModalSourceList();
        }
    }

    function addSource(url) {
        if (!url) return;
        var sources = getSources();
        var type = url.includes('t.me') ? 'telegram' : 'twitter';
        var handle = url.split('/').pop() || url;
        sources.push({ type: type, handle: handle });
        saveSources(sources);
        renderModalSourceList();
        loadNews(true);
    }

    function removeSource(index) {
        var sources = getSources();
        sources.splice(index, 1);
        saveSources(sources);
        renderModalSourceList();
        loadNews(true);
    }

    function updateTimeLabels() {
        var labels = document.querySelectorAll('.time-label');
        labels.forEach(function (label) {
            var date = label.getAttribute('data-date');
            if (date) {
                var item = label.closest('.news-item');
                if (item) {
                   var id = item.getAttribute('data-id');
                   if (toggledTimes.has(id)) {
                       label.textContent = new Date(date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                   } else {
                       label.textContent = timeAgoAr(date);
                   }
                }
            }
        });
    }

    return { render: render, init: init, removeSource: removeSource, toggleSettings: toggleSettings, showDetailPopup: showDetailPopup };
})();
