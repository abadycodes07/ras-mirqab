/* ═══════════════════════════════════════════════
   BREAKING NEWS WIDGET (عاجل)
   ═══════════════════════════════════════════════ */

var BreakingNewsWidget = (function () {
    var STORAGE_KEY = 'rasmirqab_custom_sources';
    var PROXY_BASE = localStorage.getItem('rasmirqab_proxy') || 'https://ras-mirqab.onrender.com';
    var isProxyLive = false;
    var hoverEnabled = localStorage.getItem('rasmirqab_bn_hover') !== 'false';
    var popupEl = null;
    var refreshTimer = null;
    var seenIds = new Set();
    var isFirstLoad = true;
    var settingsOpen = false;

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
                '<div class="widget-header breaking-header">' +
                '  <div class="widget-title">' +
                '    <span class="live-dot" id="bn-live-dot"></span>' +
                '    <span class="breaking-title-text">عاجل</span>' +
                '    <span class="widget-badge badge-live">NEW</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="bn-refresh-btn" title="تحديث">↻</button>' +
                '    <button class="widget-action-btn" id="bn-gear-btn" title="إضافة مصادر" style="font-size:14px;">⚙</button>' +
                '  </div>' +
                '</div>',
            body:
                '<div id="bn-settings-panel" style="display:none; padding:15px; background:rgba(10,10,10,0.98); border:1px solid #e67e22; border-radius:8px; z-index:1000; position:relative; margin:10px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">' +
                '  <div style="font-size:12px; color:#e67e22; font-weight:700; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:5px; display:flex; justify-content:space-between;">' +
                '    <span>إعدادات متقدمة / ADVANCED</span>' +
                '    <span style="cursor:pointer;" onclick="BreakingNewsWidget.toggleSettings()">✕</span>' +
                '  </div>' +
                
                '  <div style="margin-bottom:12px;">' +
                '    <label style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#888;">' +
                '      <span>تفعيل المعاينة عند الحوم (Hover)</span>' +
                '      <label class="switch" style="width:30px; height:16px;">' +
                '        <input type="checkbox" id="bn-toggle-hover" ' + (hoverEnabled ? 'checked' : '') + '>' +
                '        <span class="slider round" style="border-radius:16px;"></span>' +
                '      </label>' +
                '    </label>' +
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

    function init() {
        var gearBtn = document.getElementById('bn-gear-btn');
        if (gearBtn) gearBtn.addEventListener('click', toggleSettings);

        var refreshBtn = document.getElementById('bn-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', function () { loadNews(true); });

        var input = document.getElementById('bn-add-source');
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSource(input.value.trim());
                    input.value = '';
                }
            });
        }

        if (!document.getElementById('bn-hover-popup')) {
            popupEl = document.createElement('div');
            popupEl.id = 'bn-hover-popup';
            popupEl.className = 'bn-hover-popup';
            document.body.appendChild(popupEl);
        } else {
            popupEl = document.getElementById('bn-hover-popup');
        }

        var hoverToggle = document.getElementById('bn-toggle-hover');
        if (hoverToggle) {
            hoverToggle.addEventListener('change', function () {
                hoverEnabled = this.checked;
                localStorage.setItem('rasmirqab_bn_hover', this.checked);
            });
        }

        renderSourceList();
        loadNews();

        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(loadNews, 4000);
        
        checkProxyStatus();
    }

    function toggleSettings() {
        settingsOpen = !settingsOpen;
        var panel = document.getElementById('bn-settings-panel');
        if (panel) panel.style.display = settingsOpen ? 'block' : 'none';
        renderSourceList();
    }

    function checkProxyStatus() {
        fetch(PROXY_BASE + '/health')
            .then(function () {
                isProxyLive = true;
                var dot = document.getElementById('bn-live-dot');
                if (dot) dot.style.background = '#2ecc71';
            })
            .catch(function () {
                isProxyLive = false;
                var dot = document.getElementById('bn-live-dot');
                if (dot) dot.style.background = '#e74c3c';
            });
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

    function renderSourceList() {
        var container = document.getElementById('bn-source-list');
        if (!container) return;
        var sources = getSources();
        var hardcoded = [
            { type: 'twitter', handle: 'alrougui', fixed: true },
            { type: 'twitter', handle: 'NewsNow4USA', fixed: true },
            { type: 'twitter', handle: 'AJELNEWS24', fixed: true },
            { type: 'twitter', handle: 'AsharqNewsBrk', fixed: true },
            { type: 'twitter', handle: 'Alhadath_Brk', fixed: true },
            { type: 'twitter', handle: 'modgovksa', fixed: true },
            { type: 'telegram', handle: 'ajanews', fixed: true }
        ];
        var all = hardcoded.concat(sources);
        var html = '';
        all.forEach(function (s, i) {
            var icon = s.type === 'twitter' ? '𝕏' : '📱';
            var color = s.type === 'twitter' ? '#1DA1F2' : '#0088cc';
            var btn = s.fixed ? '' : '<button onclick="BreakingNewsWidget.removeSource(' + (i - hardcoded.length) + ')" style="background:none; border:none; color:#ff4d4d; cursor:pointer;">✕</button>';
            html += '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px; border-bottom:1px solid #222;">' +
                '<span style="color:' + color + '">' + icon + ' ' + s.handle + '</span>' + btn + '</div>';
        });
        container.innerHTML = html;
    }

    async function loadNews() {
        var container = document.getElementById('breaking-news-body');
        if (!container) return;

        var items = await fetchAllFeeds();
        if (!items || items.length === 0) {
            if (isFirstLoad) container.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">لا توجد أخبار حالياً...</div>';
            return;
        }

        items.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

        var newCount = 0;
        items.forEach(function (item) {
            var id = item.link + (item.title ? item.title.substring(0, 20) : item.pubDate);
            if (!seenIds.has(id)) {
                if (!isFirstLoad) { newCount++; item.isNew = true; }
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
        var all = [];
        try {
            var cloudRes = await fetch('https://abadycodes07.github.io/ras-mirqab/public/data/news-live.json?t=' + Date.now());
            if (cloudRes.ok) {
                var cloudData = await cloudRes.json();
                if (cloudData && cloudData.items) all = cloudData.items;
            }
        } catch (e) {}

        if (isProxyLive) {
            var targetSources = [
                { type: 'twitter', handle: 'alrougui', avatar: 'public/logos/alrougui.jpg' },
                { type: 'twitter', handle: 'NewsNow4USA', avatar: 'public/logos/newsnow.jpg' },
                { type: 'twitter', handle: 'AJELNEWS24', avatar: 'public/logos/ajelnews.jpg' },
                { type: 'twitter', handle: 'AsharqNewsBrk', avatar: 'public/logos/asharq2.jpg' },
                { type: 'twitter', handle: 'Alhadath_Brk', avatar: 'public/logos/alhadath3.png' },
                { type: 'twitter', handle: 'modgovksa', avatar: 'public/logos/modgovksa2.png' },
                { type: 'telegram', handle: 'ajanews', avatar: 'public/logos/aljazeera.png' }
            ];
            var proxyPromises = targetSources.map(function (s) {
                var url = PROXY_BASE + (s.type === 'telegram' ? '/telegram?channel=' : '/twitter?user=') + encodeURIComponent(s.handle);
                return fetch(url).then(r => r.json()).then(d => {
                    var fetched = d.items || [];
                    fetched.forEach(item => { item.customAvatar = s.avatar; item.customName = s.handle; });
                    return fetched;
                }).catch(() => []);
            });
            try {
                var results = await Promise.all(proxyPromises);
                results.forEach(arr => {
                    arr.forEach(pItem => {
                        if (!all.some(c => c.link === pItem.link)) all.push(pItem);
                    });
                });
            } catch (e) {}
        }
        return all;
    }

    function renderItems(container, items) {
        container.innerHTML = '';
        items.forEach(function (item) {
            var sClass = 'source-' + (item.source || 'rss');
            var sLabel = item.source === 'telegram' ? 'TG' : item.source === 'twitter' ? '𝕏' : (item.sourceName || 'RSS');
            var timeStr = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

            var avatarHtml = item.customAvatar ? '<img src="' + item.customAvatar + '" style="width:25px;height:25px;border-radius:50%;object-fit:cover;margin-left:8px;border:1px solid #444;" />' : '';
            var borderColor = item.source === 'twitter' ? '#1DA1F2' : (item.source === 'telegram' ? '#0088cc' : '#f1c40f');
            var highlightClass = item.isNew ? ' news-item-new' : '';

            var itemEl = document.createElement('div');
            itemEl.className = 'news-item' + highlightClass;
            itemEl.style = 'border-left: 2px solid ' + borderColor + '; padding:8px; margin-bottom:4px; cursor:pointer; display:flex;';
            itemEl.onclick = function() { window.open(item.link, '_blank'); };

            itemEl.innerHTML =
                '  <div style="display:flex; justify-content:space-between; width:100%;">' +
                '    <div style="display:flex; align-items:flex-start;">' +
                '      <span class="news-source-badge ' + sClass + '">' + sLabel + '</span>' +
                '      <div style="flex:1;">' +
                '        <div class="news-text">' + (item.title || item.text || '') + '</div>' +
                '        <div class="news-time">' + timeStr + ' • ' + (item.customName || item.sourceName || '') + '</div>' +
                '      </div>' +
                '    </div>' +
                '    <div style="flex-shrink:0;">' + avatarHtml + '</div>' +
                '  </div>';

            itemEl.addEventListener('mouseenter', function (e) {
                if (!hoverEnabled || !popupEl) return;
                var rect = itemEl.getBoundingClientRect();
                var media = item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);
                var imgHtml = media ? '<img src="' + media + '" class="bn-popup-image has-img" style="max-width:100%; border-radius:4px; margin:8px 0;" />' : '';
                
                popupEl.innerHTML = 
                    '<div class="bn-popup-header" style="color:#e67e22; font-weight:700; font-size:12px; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px;">🚨 معاينة الخبر العاجل</div>' +
                    imgHtml +
                    '<div class="bn-popup-text" style="font-size:13px; line-height:1.5; margin-bottom:8px;">' + (item.title || item.text || '') + '</div>' +
                    '<div class="bn-popup-meta" style="font-size:10px; color:#888; display:flex; justify-content:space-between;">' +
                    '  <span>المصدر: ' + (item.customName || item.sourceName || item.source) + '</span>' +
                    '  <span>الوقت: ' + timeStr + '</span>' +
                    '</div>';
                
                popupEl.classList.add('active');
                var pW = popupEl.offsetWidth || 350;
                var pH = popupEl.offsetHeight || 150;
                var left = rect.left - pW - 20;
                if (left < 20) left = rect.right + 20;
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

    return { render: render, init: init, removeSource: removeSource, toggleSettings: toggleSettings };
})();
