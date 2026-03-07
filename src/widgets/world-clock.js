/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = localStorage.getItem('rasmirqab_clock_12h') !== 'false';
    var selectedCities = [];
    var settingsOpen = false;
    var searchQuery = '';

    var ALL_CITIES = [
        { name: 'الرياض', tz: 'Asia/Riyadh', country: 'السعودية' },
        { name: 'مكة المكرمة', tz: 'Asia/Riyadh', country: 'السعودية' },
        { name: 'أبو ظبي', tz: 'Asia/Dubai', country: 'الإمارات' },
        { name: 'دبي', tz: 'Asia/Dubai', country: 'الإمارات' },
        { name: 'الكويت', tz: 'Asia/Kuwait', country: 'الكويت' },
        { name: 'الدوحة', tz: 'Asia/Qatar', country: 'قطر' },
        { name: 'مسقط', tz: 'Asia/Muscat', country: 'عمان' },
        { name: 'المنامة', tz: 'Asia/Bahrain', country: 'البحرين' },
        { name: 'عمان', tz: 'Asia/Amman', country: 'الأردن' },
        { name: 'القاهرة', tz: 'Africa/Cairo', country: 'مصر' },
        { name: 'إسطنبول', tz: 'Europe/Istanbul', country: 'تركيا' },
        { name: 'لندن', tz: 'Europe/London', country: 'بريطانيا' },
        { name: 'باريس', tz: 'Europe/Paris', country: 'فرنسا' },
        { name: 'برلين', tz: 'Europe/Berlin', country: 'ألمانيا' },
        { name: 'موسكو', tz: 'Europe/Moscow', country: 'روسيا' },
        { name: 'نيويورك', tz: 'America/New_York', country: 'أمريكا' },
        { name: 'واشنطن العاصمة', tz: 'America/New_York', country: 'أمريكا' },
        { name: 'لوس أنجلوس', tz: 'America/Los_Angeles', country: 'أمريكا' },
        { name: 'شيكاغو', tz: 'America/Chicago', country: 'أمريكا' },
        { name: 'تورونتو', tz: 'America/Toronto', country: 'كندا' },
        { name: 'بكين', tz: 'Asia/Shanghai', country: 'الصين' },
        { name: 'شنغهاي', tz: 'Asia/Shanghai', country: 'الصين' },
        { name: 'طوكيو', tz: 'Asia/Tokyo', country: 'اليابان' },
        { name: 'سول', tz: 'Asia/Seoul', country: 'كوريا الجنوبية' },
        { name: 'هونغ كونغ', tz: 'Asia/Hong_Kong', country: 'الصين' },
        { name: 'سنغافورة', tz: 'Asia/Singapore', country: 'سنغافورة' },
        { name: 'مومباي', tz: 'Asia/Kolkata', country: 'الهند' },
        { name: 'سيدني', tz: 'Australia/Sydney', country: 'أستراليا' },
        { name: 'ساو باولو', tz: 'America/Sao_Paulo', country: 'البرازيل' },
        { name: 'مكسيكو سيتي', tz: 'America/Mexico_City', country: 'المكسيك' }
    ];

    function getSelected() {
        try {
            var raw = localStorage.getItem('rasmirqab_selected_clocks');
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.length > 0) return parsed;
            }
        } catch(e) {}
        // Default to: Riyadh, Abu Dhabi, Kuwait, New York
        return [
            ALL_CITIES[0],  // الرياض
            ALL_CITIES[2],  // أبو ظبي
            ALL_CITIES[4],  // الكويت
            ALL_CITIES[15]  // نيويورك
        ];
    }

    function saveSelected(arr) {
        localStorage.setItem('rasmirqab_selected_clocks', JSON.stringify(arr));
        selectedCities = arr;
    }

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">' +
                '    <span>🌐</span>' +
                '    <span>توقيت العالم</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="world-clock-format-btn" title="تبديل 12/24 ساعة">🕒</button>' +
                '    <button class="widget-action-btn" id="world-clock-settings-btn" title="إدارة التوقيتات">⚙</button>' +
                '  </div>' +
                '</div>',
            body: 
                '<div class="widget-body"><div class="clock-grid" id="clock-grid"></div></div>',
        };
    }

    function init() {
        selectedCities = getSelected();

        var formatBtn = document.getElementById('world-clock-format-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', function () {
                is12Hour = !is12Hour;
                localStorage.setItem('rasmirqab_clock_12h', is12Hour);
                updateClocks();
            });
        }

        var settingsBtn = document.getElementById('world-clock-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', toggleSettings);
        }

        // Modal Events
        var closeBtn = document.getElementById('close-world-clock-modal');
        if (closeBtn) {
            closeBtn.onclick = function() {
                document.getElementById('world-clock-modal').classList.add('hidden');
                settingsOpen = false;
            };
        }

        var searchInput = document.getElementById('city-search');
        if (searchInput) {
            searchInput.oninput = function(e) {
                searchQuery = e.target.value.toLowerCase();
                renderSettings();
            };
        }

        updateClocks();
        setInterval(updateClocks, 1000);
    }

    function toggleSettings() {
        settingsOpen = !settingsOpen;
        var modal = document.getElementById('world-clock-modal');
        if (modal) {
            if (settingsOpen) {
                modal.classList.remove('hidden');
                renderSettings();
            } else {
                modal.classList.add('hidden');
            }
        }
    }

    function renderSettings() {
        var grid = document.getElementById('available-cities-grid');
        if (!grid) return;

        var filtered = ALL_CITIES.filter(function(city) {
            var searchLower = searchQuery.toLowerCase();
            return city.name.toLowerCase().includes(searchLower) || 
                   city.country.toLowerCase().includes(searchLower);
        });

        var html = '';
        filtered.forEach(function(city) {
            var isSelected = selectedCities.some(function(s) { return s.tz === city.tz && s.name === city.name; });
            
            html +=
                '<div class="channel-card ' + (isSelected ? 'selected' : '') + '" onclick="WorldClockWidget.toggleCity(\'' + city.name + '\',\'' + city.tz + '\')">' +
                '  <div class="channel-card-info">' +
                '    <div class="channel-avatar">' + city.name[0] + '</div>' +
                '    <div class="channel-name-v">' +
                '      <span class="ch-title">' + city.name + '</span>' +
                '      <span class="ch-handle">' + city.country.toUpperCase() + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="ch-status-icon">' +
                (isSelected ? '<span class="ch-check">✓</span>' : '<span class="ch-add-icon">+</span>') +
                '  </div>' +
                '</div>';
        });
        grid.innerHTML = html;
    }

    function toggleCity(name, tz) {
        var idx = selectedCities.findIndex(function(s) { return s.tz === tz && s.name === name; });
        if (idx > -1) {
            if (selectedCities.length > 1) selectedCities.splice(idx, 1);
        } else {
            var city = ALL_CITIES.find(function(c) { return c.tz === tz && c.name === name; });
            if (city) selectedCities.push(city);
        }
        saveSelected(selectedCities);
        renderSettings();
        updateClocks();
    }

    function updateClocks() {
        var container = document.getElementById('clock-grid');
        if (!container) return;

        var html = '';
        var now = new Date();

        selectedCities.forEach(function (city) {
            var formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: city.tz,
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: is12Hour
            });
            var timeStr = formatter.format(now);
            
            var dateStr = now.toLocaleDateString('ar-SA', {
                timeZone: city.tz,
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            html +=
                '<div class="clock-cell">' +
                '  <div class="clock-city">' + city.name + '</div>' +
                '  <div class="clock-time">' + timeStr + '</div>' +
                '  <div class="clock-date">' + dateStr + '</div>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    return { render: render, init: init, toggleCity: toggleCity, toggleSettings: toggleSettings };
})();
