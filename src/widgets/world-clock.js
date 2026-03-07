/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = localStorage.getItem('rasmirqab_clock_12h') !== 'false';
    var selectedCities = [];
    var settingsOpen = false;

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
                '<div id="clock-settings-panel" style="display:none; padding:15px; background:rgba(10,10,10,0.98); border:1px solid var(--accent); border-radius:8px; z-index:1000; position:relative; margin:10px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">' +
                '  <div style="font-size:12px; color:var(--accent); font-weight:700; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:5px; display:flex; justify-content:space-between;">' +
                '    <span>إدارة التوقيتات / WORLD CLOCKS</span>' +
                '    <span style="cursor:pointer;" onclick="WorldClockWidget.toggleSettings()">✕</span>' +
                '  </div>' +
                '  <div id="clock-selection-list" style="max-height:180px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:8px;"></div>' +
                '</div>' +
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

        updateClocks();
        setInterval(updateClocks, 1000);
    }

    function toggleSettings() {
        settingsOpen = !settingsOpen;
        var panel = document.getElementById('clock-settings-panel');
        if (panel) panel.style.display = settingsOpen ? 'block' : 'none';
        if (settingsOpen) renderSettings();
    }

    function renderSettings() {
        var container = document.getElementById('clock-selection-list');
        if (!container) return;

        var html = '';
        ALL_CITIES.forEach(function(city) {
            var isSelected = selectedCities.some(function(s) { return s.tz === city.tz && s.name === city.name; });
            
            // Greyed out vs Green style
            var style = isSelected 
                ? 'background:rgba(0, 255, 127, 0.2); border:1px solid #00ff7f; color:#fff;' 
                : 'background:rgba(255,255,255,0.05); border:1px solid #444; color:#666;';
            
            var checkMark = isSelected ? '<span style="color:#00ff7f; margin-left:5px;">✓</span>' : '<span style="color:#444; margin-left:5px;">□</span>';

            html += '<div class="city-opt" style="' + style + ' padding:8px; border-radius:4px; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition:0.2s; margin-bottom:2px;" ' +
                    'onclick="WorldClockWidget.toggleCity(\'' + city.name + '\',\'' + city.tz + '\')">' +
                    '<span>' + city.name + '</span>' + checkMark + '</div>';
        });
        container.innerHTML = html;
    }

    function toggleCity(name, tz) {
        var idx = selectedCities.findIndex(function(s) { return s.tz === tz && s.name === name; });
        if (idx > -1) {
            if (selectedCities.length > 1) selectedCities.splice(idx, 1);
        } else {
            selectedCities.push({ name: name, tz: tz });
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
