/* ═══════════════════════════════════════════════
   LIVE TV WIDGET
   ═══════════════════════════════════════════════ */

var LiveTVWidget = (function () {
    var defaultChannels = [
        { key: 'aljazeera', name: 'الجزيرة', videoId: 'bNyUyrR0PHo', region: 'me' },
        { key: 'alarabiya', name: 'العربية', videoId: 'n7eQejkXbnM', region: 'me' },
        { key: 'skynews', name: 'سكاي نيوز عربية', videoId: 'U--OjmpjF5o', region: 'me' },
        { key: 'france24', name: 'فرانس 24 عربية', videoId: '3ursYA8HMeo', region: 'eu' },
        { key: 'bbc', name: 'BBC عربي', videoId: 'L8QJYzS9ezI', region: 'eu' },
        { key: 'alhadath', name: 'الحدث', videoId: 'xWXpl7azI8k', region: 'me' },
    ];

    var allChannelsPool = [
        ...defaultChannels,
        { key: 'aljazeera-en', name: 'Al Jazeera English', videoId: '-jvLzK_OasE', region: 'me' },
        { key: 'cnn', name: 'CNN International', videoId: 'mI47H66z5Sg', region: 'na' },
        { key: 'msnbc', name: 'MSNBC', videoId: 'm47Y9-L6Czk', region: 'na' },
        { key: 'dw', name: 'DW News', videoId: 'V9KZGbkYq08', region: 'eu' },
        { key: 'trt', name: 'TRT World', videoId: 'p0m0h94C0f8', region: 'me' },
        { key: 'asharq', name: 'اقتصاد الشرق', videoId: 'S_fU10Q7lXg', region: 'me' },
        { key: 'bloomberg', name: 'Bloomberg TV', videoId: 'dp8PhLsUcFE', region: 'na' }
    ];

    var channels = JSON.parse(localStorage.getItem('ras-mirqab-tv-channels')) || defaultChannels;
    var currentChannel = 0;
    var activeTab = 'all';
    var searchQuery = '';

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">' +
                '    <span>📺</span>' +
                '    <span>البث المباشر</span>' +
                '    <span class="widget-badge badge-live">LIVE</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="tv-settings-btn" title="إعدادات القناة">⚙️</button>' +
                '  </div>' +
                '</div>',
            body:
                '<div class="widget-body" id="live-tv-body" style="display: flex; flex-direction: column; padding: 0;">' +
                '  <div class="tv-container" id="tv-embed" style="flex: 1; min-height: 0;"></div>' +
                '  <div class="tv-controls" id="tv-channel-buttons" style="padding: 8px;"></div>' +
                '</div>',
        };
    }

    function init() {
        renderEmbed();
        renderChannelButtons();
        initModalEvents();
    }

    function initModalEvents() {
        var btn = document.getElementById('tv-settings-btn');
        var modal = document.getElementById('manage-channels-modal');
        var closeBtn = document.getElementById('close-manage-channels-modal');

        if (btn) btn.onclick = openManageChannelsModal;
        if (closeBtn) closeBtn.onclick = function () { modal.classList.add('hidden'); };

        // Search
        var searchInput = document.getElementById('channel-search');
        if (searchInput) {
            searchInput.oninput = function (e) {
                searchQuery = e.target.value.toLowerCase();
                renderAvailableChannels();
            };
        }

        // Tabs
        var tabContainer = document.getElementById('channels-tabs');
        if (tabContainer) {
            tabContainer.onclick = function (e) {
                var t = e.target.closest('.tab-btn');
                if (!t) return;
                tabContainer.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
                t.classList.add('active');
                activeTab = t.dataset.tab;
                renderAvailableChannels();
            };
        }

        // Add Custom
        var addBtn = document.getElementById('btn-add-custom-channel');
        if (addBtn) {
            addBtn.onclick = function () {
                var urlInput = document.getElementById('custom-ch-url');
                var nameInput = document.getElementById('custom-ch-name');
                if (!urlInput.value) return;

                var videoId = extractVideoId(urlInput.value);
                var name = nameInput.value || 'Custom Channel';

                var newCh = { key: 'custom-' + Date.now(), name: name, videoId: videoId, region: 'other' };
                allChannelsPool.push(newCh);
                urlInput.value = '';
                nameInput.value = '';
                renderAvailableChannels();
            };
        }
    }

    function extractVideoId(input) {
        // Basic extractor for YT IDs or URLs
        if (input.includes('watch?v=')) return input.split('v=')[1].split('&')[0];
        if (input.includes('youtu.be/')) return input.split('youtu.be/')[1].split('?')[0];
        return input; // Assume it's a direct ID
    }

    function openManageChannelsModal() {
        document.getElementById('manage-channels-modal').classList.remove('hidden');
        renderAvailableChannels();
    }

    function renderAvailableChannels() {
        var grid = document.getElementById('available-channels-grid');
        if (!grid) return;

        var filtered = allChannelsPool.filter(function (ch) {
            var matchesTab = activeTab === 'all' || ch.region === activeTab;
            var matchesSearch = ch.name.toLowerCase().includes(searchQuery);
            return matchesTab && matchesSearch;
        });

        var html = '';
        filtered.forEach(function (ch) {
            var isSelected = channels.some(function (sel) { return sel.key === ch.key; });
            html +=
                '<div class="channel-card ' + (isSelected ? 'selected' : '') + '" data-key="' + ch.key + '">' +
                '  <div class="channel-card-info">' +
                '    <div class="channel-avatar">' + ch.name[0] + '</div>' +
                '    <div class="channel-name-v">' +
                '      <span class="ch-title">' + ch.name + '</span>' +
                '      <span class="ch-handle">' + (ch.region || 'global').toUpperCase() + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="ch-status-icon">' +
                (isSelected ? '<span class="ch-check">✓</span>' : '<span class="ch-add-icon">+</span>') +
                '  </div>' +
                '</div>';
        });
        grid.innerHTML = html;

        grid.onclick = function (e) {
            var card = e.target.closest('.channel-card');
            if (!card) return;
            var key = card.dataset.key;
            toggleChannelSelection(key);
        };
    }

    function toggleChannelSelection(key) {
        var existingIdx = channels.findIndex(function (ch) { return ch.key === key; });
        if (existingIdx !== -1) {
            // Remove if more than 1 channel remains
            if (channels.length > 1) {
                channels.splice(existingIdx, 1);
            }
        } else {
            var fullCh = allChannelsPool.find(function (ch) { return ch.key === key; });
            if (fullCh) channels.push(fullCh);
        }

        localStorage.setItem('ras-mirqab-tv-channels', JSON.stringify(channels));
        renderAvailableChannels();
        renderChannelButtons();
        // Adjust current selection if needed
        if (currentChannel >= channels.length) {
            currentChannel = 0;
            renderEmbed();
        }
    }

    function renderEmbed() {
        var embed = document.getElementById('tv-embed');
        if (!embed) return;
        var ch = channels[currentChannel];
        embed.innerHTML =
            '<iframe src="https://www.youtube.com/embed/' + ch.videoId + '?autoplay=1&mute=0&rel=0" ' +
            'allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    }

    function renderChannelButtons() {
        var container = document.getElementById('tv-channel-buttons');
        if (!container) return;
        var html = '';
        channels.forEach(function (ch, i) {
            html += '<button class="tv-channel-btn' + (i === currentChannel ? ' active' : '') +
                '" data-idx="' + i + '">' + ch.name + '</button>';
        });
        container.innerHTML = html;

        container.addEventListener('click', function (e) {
            var btn = e.target.closest('.tv-channel-btn');
            if (!btn) return;
            currentChannel = parseInt(btn.dataset.idx);
            renderEmbed();
            container.querySelectorAll('.tv-channel-btn').forEach(function (b, i) {
                b.classList.toggle('active', i === currentChannel);
            });
        });
    }

    return {
        render: render,
        init: init,
        reloadWithAudio: renderEmbed
    };
})();
