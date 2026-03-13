/* ═══════════════════════════════════════════════
   BREAKING NEWS WIDGET (عاجل)
   ═══════════════════════════════════════════════ */

var BreakingNewsWidget = (function () {
    var STORAGE_KEY = 'rasmirqab_custom_sources';
    var PROXY_BASE = localStorage.getItem('rasmirqab_proxy') || 'http://localhost:3001';
    var isProxyLive = false;
    var hoverEnabled = localStorage.getItem('rasmirqab_bn_hover') !== 'false';
    var popupEl = null;
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
        loadNews(); // Initial fetch & render

        if (refreshTimer) clearInterval(refreshTimer);
        // Refresh ONLY the "time ago" labels every second to prevent flicker
        refreshTimer = setInterval(updateTimeLabels, 1000);
        
        // Fetch fresh data every 5 seconds for near-real-time updates
        setInterval(loadNews, 5000);
        
        checkProxyStatus();
    }

    function updateTimeLabels() {
        var timeLabels = document.querySelectorAll('.news-item-time');
        timeLabels.forEach(function(btn) {
            var dateStr = btn.getAttribute('data-date');
            if (dateStr) {
                var id = btn.getAttribute('data-id');
                var isToggled = toggledTimes.has(id);
                if (isToggled) {
                    // Absolute time doesn't need updating every second, but we do it to keep logic simple
                    var absoluteTime = new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                    btn.innerText = absoluteTime;
                } else {
                    btn.innerText = timeAgoAr(dateStr);
                }
            }
        });
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
            { type: 'telegram', handle: 'ajanews', fixed: true },
            { type: 'telegram', handle: 'AlHadath_Brk', fixed: true },
            { type: 'twitter', handle: 'Twitter List', fixed: true }
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
            // Using a longer title slice + pubDate for a more robust unique ID
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
        
        // Smarter merging for the UI to prevent disappearing items
        if (lastFetchedItems.length === 0) {
            lastFetchedItems = items;
        } else {
            // Merge new items into existing ones
            var existingItems = [...lastFetchedItems];
            items.forEach(function(newItem) {
                var newId = (newItem.link || '') + (newItem.title ? newItem.title.substring(0, 50) : newItem.pubDate);
                if (!existingItems.some(function(ei) {
                    var oldId = (ei.link || '') + (ei.title ? ei.title.substring(0, 50) : ei.pubDate);
                    return oldId === newId;
                })) {
                    existingItems.push(newItem);
                }
            });
            existingItems.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
            lastFetchedItems = existingItems.slice(0, 120); // Keep reasonably sized
        }

        renderItems(container, lastFetchedItems);
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

        // Always attempt proxy fetch — don't gate on health check (cold starts cause false negatives)
        {
            var targetSources = [
                { type: 'telegram', handle: 'ajanews', avatar: 'public/logos/aljazeera.png', name: 'الجزيرة عاجل' },
                { type: 'telegram', handle: 'AlHadath_Brk', avatar: 'public/logos/alhadath.png', name: 'الحدث عاجل' }
            ];

            // Add user-added sources (telegram only — Twitter is handled by /twitter endpoint)
            var userSources = getSources();
            userSources.forEach(function(us) {
                if (us.type === 'telegram' && !targetSources.some(function(ts) { return ts.handle === us.handle; })) {
                    targetSources.push(us);
                }
            });

            var proxyPromises = targetSources.map(function (s) {
                var isCore = s.handle === 'ajanews';
                var url = PROXY_BASE + '/telegram?channel=' + encodeURIComponent(s.handle);
                if (isCore) url += '&fast=true';
                
                return fetch(url).then(r => r.json()).then(d => {
                    var fetched = d.items || [];
                    fetched.forEach(item => { 
                        item.customAvatar = s.avatar; 
                        item.customName = s.name || s.handle; 
                    });
                    return fetched;
                }).catch(() => []);
            });

            // Fetch ALL twitter list tweets in a single call (12 accounts combined)
            proxyPromises.push(
                fetch(PROXY_BASE + '/twitter').then(r => r.json()).then(d => {
                    return (d.items || []);
                }).catch(() => [])
            );

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
        // To prevent flicker, we only rebuild if count changed or it's first load
        // Or we can be smarter and only add new items to the top
        var currentItemCount = container.querySelectorAll('.news-item').length;
        
        // If it's a completely new list or first load, rebuild once
        if (currentItemCount === 0 || items.length !== currentItemCount) {
             container.innerHTML = '';
        } else {
            // Already rendered, updateTimeLabels will handle the countdowns
            return;
        }

        items.forEach(function (item) {
            var id = (item.link || '') + (item.title ? item.title.substring(0, 50) : item.pubDate);
            var isToggled = toggledTimes.has(id);
            
            var relativeTime = timeAgoAr(item.pubDate);
            var absoluteTime = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            
            var displayTime = isToggled ? absoluteTime : relativeTime;
            var highlightClass = item.isNew ? ' news-item-new' : '';
            
            var itemEl = document.createElement('div');
            itemEl.className = 'news-item' + highlightClass;
            
            // Premium Platform Icons
            var twitterIcon = '<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg>';
            var telegramIcon = '<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.84-1.67 6.41-2.77 7.7-3.3 3.66-1.51 4.42-1.77 4.92-1.78.11 0 .35.03.51.15.13.11.17.25.19.35.02.13.02.26.01.39z"/></svg>';
            var platformIcon = item.source === 'twitter' ? twitterIcon : (item.source === 'telegram' ? telegramIcon : '');
            var platformColor = item.source === 'twitter' ? '#ffffff' : (item.source === 'telegram' ? '#24a1de' : '#666');

            itemEl.style = 'padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; display:flex; flex-direction:row-reverse; align-items:center; gap:12px; transition: background 0.2s;';
            itemEl.onclick = function() { window.open(item.link, '_blank'); };
            
            // Hover effect
            itemEl.onmouseenter = function() { itemEl.style.background = 'rgba(255,255,255,0.04)'; };
            itemEl.onmouseleave = function() { itemEl.style.background = 'transparent'; if (popupEl) popupEl.classList.remove('active'); };

            // [RIGHT] Thumbnail logic
            var thumbnailPath = item.localMedia || item.mediaUrl || item.image;
            if (!thumbnailPath || thumbnailPath.includes('placeholder')) {
                if (item.source === 'twitter' && item.customAvatar) thumbnailPath = item.customAvatar;
                else if (item.source === 'telegram' && item.customAvatar) thumbnailPath = item.customAvatar;
                else thumbnailPath = 'public/logos/aljazeera.png';
            }
            
            var thumbnailHtml = '<div style="width:75px; height:75px; flex-shrink:0; border-radius:10px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 10px rgba(0,0,0,0.3);">' +
                '<img src="' + thumbnailPath + '" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=\'public/logos/aljazeera.png\'; this.style.opacity=0.5;" />' +
                '</div>';

            // [CENTER] Text Content
            var contentHtml = '<div style="flex:1; direction:rtl; text-align:right;">' +
                '<div style="font-size:13px; line-height:1.45; color:#fff; font-weight:500; margin-bottom:6px; max-height:2.9em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-family:\'Tajawal\', sans-serif;">' + (item.title || '') + '</div>' +
                '<div style="font-size:10px; color:#777; font-family:\'Inter\', sans-serif; letter-spacing:0.5px;">' +
                '<span style="color:#e67e22; font-weight:600; margin-left:8px;">' + (item.customName || item.sourceName || '') + '</span>' +
                '</div>' +
                '</div>';

            // [LEFT] Logo, Badge and Time
            var avatarPath = item.customAvatar;
            if (!avatarPath) avatarPath = (item.source === 'twitter') ? 'public/logos/twitter_bg.png' : 'public/logos/aljazeera.png';
            
            var logoHtml = '<div style="display:flex; flex-direction:column; align-items:center; gap:8px; min-width:45px; flex-shrink:0;">' +
                '<div style="position:relative; width:34px; height:34px;">' +
                '<img src="' + avatarPath + '" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.1);" onerror="this.src=\'public/logos/aljazeera.png\'" />' +
                '<div style="position:absolute; bottom:-4px; right:-4px; width:15px; height:15px; border-radius:50%; background:#111; border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:' + platformColor + ';">' + platformIcon + '</div>' +
                '</div>' +
                '<div class="news-item-time" data-date="' + item.pubDate + '" data-id="' + id + '" style="font-size:10px; color:#555; font-weight:600; font-family:\'Orbitron\', sans-serif; cursor:pointer; text-decoration:underline dashed rgba(255,255,255,0.1);" title="اضغط لتبديل عرض الوقت">' + displayTime + '</div>' +
                '</div>';

            itemEl.innerHTML = thumbnailHtml + contentHtml + logoHtml;

            var timeBtn = itemEl.querySelector('.news-item-time');
            if (timeBtn) {
                timeBtn.onclick = function(e) {
                    e.stopPropagation();
                    if (toggledTimes.has(id)) toggledTimes.delete(id);
                    else toggledTimes.add(id);
                    updateTimeLabels(); // Update text immediately
                };
            }

            // Hover preview support
            itemEl.addEventListener('mouseenter', function (e) {
                if (!hoverEnabled || !popupEl) return;
                var rect = itemEl.getBoundingClientRect();
                var media = item.localMedia || item.mediaUrl || item.image || (item.media && item.media[0] ? item.media[0].url : null);
                var imgHtml = media ? '<img src="' + media + '" class="bn-popup-image has-img" style="max-width:100%; border-radius:6px; margin:8px 0; border:1px solid #444;" />' : '';
                
                popupEl.innerHTML = 
                    '<div class="bn-popup-header" style="color:#e67e22; font-weight:800; font-size:11px; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:6px; letter-spacing:1px;">🚨 BREAKING LIVE</div>' +
                    imgHtml +
                    '<div class="bn-popup-text" style="font-size:13.5px; line-height:1.6; margin-bottom:10px; color:#fff; font-family:\'Tajawal\', sans-serif;">' + (item.title || item.text || '') + '</div>' +
                    '<div class="bn-popup-meta" style="font-size:9px; color:#666; display:flex; justify-content:space-between; font-family:\'Inter\', sans-serif; text-transform:uppercase;">' +
                    '  <span>Source: ' + (item.customName || item.sourceName || item.source) + '</span>' +
                    '  <span>' + timeAgoAr(item.pubDate) + '</span>' +
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

            container.appendChild(itemEl);
        });
    }

    return { render: render, init: init, removeSource: removeSource, toggleSettings: toggleSettings };
})();
