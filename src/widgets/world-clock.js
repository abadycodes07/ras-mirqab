/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = localStorage.getItem('rasmirqab_clock_12h') !== 'false';
    var selectedCities = [];
    var ALL_CITIES = [
        { name: 'الرياض', tz: 'Asia/Riyadh', country: 'السعودية' },
        { name: 'مكة المكرمة', tz: 'Asia/Riyadh', country: 'السعودية' },
        { name: 'دبي', tz: 'Asia/Dubai', country: 'الإمارات' },
        { name: 'أبو ظبي', tz: 'Asia/Dubai', country: 'الإمارات' },
        { name: 'الكويت', tz: 'Asia/Kuwait', country: 'الكويت' },
        { name: 'الدوحة', tz: 'Asia/Qatar', country: 'قطر' },
        { name: 'القاهرة', tz: 'Africa/Cairo', country: 'مصر' },
        { name: 'عمان', tz: 'Asia/Amman', country: 'الأردن' },
        { name: 'بيروت', tz: 'Asia/Beirut', country: 'لبنان' },
        { name: 'بغداد', tz: 'Asia/Baghdad', country: 'العراق' },
        { name: 'إسطنبول', tz: 'Europe/Istanbul', country: 'تركيا' },
        { name: 'نيويورك', tz: 'America/New_York', country: 'أمريكا' },
        { name: 'واشنطن', tz: 'America/New_York', country: 'أمريكا' },
        { name: 'لندن', tz: 'Europe/London', country: 'بريطانيا' },
        { name: 'باريس', tz: 'Europe/Paris', country: 'فرنسا' },
        { name: 'برلين', tz: 'Europe/Berlin', country: 'ألمانيا' },
        { name: 'موسكو', tz: 'Europe/Moscow', country: 'روسيا' },
        { name: 'بكين', tz: 'Asia/Shanghai', country: 'الصين' },
        { name: 'طوكيو', tz: 'Asia/Tokyo', country: 'اليابان' },
        { name: 'سول', tz: 'Asia/Seoul', country: 'كوريا الجنوبية' },
        { name: 'نيودلهي', tz: 'Asia/Kolkata', country: 'الهند' },
        { name: 'سنغافورة', tz: 'Asia/Singapore', country: 'سنغافورة' },
        { name: 'سيدني', tz: 'Australia/Sydney', country: 'أستراليا' },
        { name: 'طهران', tz: 'Asia/Tehran', country: 'إيران' },
        { name: 'تل أبيب', tz: 'Asia/Jerusalem', country: 'فلسطين المحتلة' },
        { name: 'كييف', tz: 'Europe/Kiev', country: 'أوكرانيا' },
        { name: 'بروكسل', tz: 'Europe/Brussels', country: 'بلجيكا' },
        { name: 'جنيف', tz: 'Europe/Zurich', country: 'سويسرا' },
        { name: 'روما', tz: 'Europe/Rome', country: 'إيطاليا' },
        { name: 'مدريد', tz: 'Europe/Madrid', country: 'إسبانيا' }
    ];

    function getSelected() {
        try {
            var raw = localStorage.getItem('rasmirqab_selected_clocks');
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return [
            { name: 'الرياض', tz: 'Asia/Riyadh' },
            { name: 'نيويورك', tz: 'America/New_York' },
            { name: 'لندن', tz: 'Europe/London' }
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
                '<div id="clock-settings-panel" style="display:none; padding:15px; background:rgba(10,10,10,0.98); border:1px solid var(--accent); border-radius:8px; z-index:1000; position:relative; margin:10px;">' +
                '  <div style="font-size:12px; color:var(--accent); font-weight:700; margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:5px;">إدارة التوقيتات / WORLD CLOCKS</div>' +
                '  <div id="clock-selection-list" style="max-height:250px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:8px;"></div>' +
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

    var settingsOpen = false;
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
            var activeClass = isSelected ? 'background:var(--accent); color:#000;' : 'background:#222; color:#888;';
            
            html += '<div class="city-opt" style="' + activeClass + ' padding:6px; border-radius:4px; font-size:10px; cursor:pointer; text-align:center; transition:0.2s;" ' +
                    'onclick="WorldClockWidget.toggleCity(\'' + city.name + '\',\'' + city.tz + '\')">' +
                    city.name + ' (' + city.country + ')</div>';
        });
        container.innerHTML = html;
    }

    function toggleCity(name, tz) {
        var idx = selectedCities.findIndex(function(s) { return s.tz === tz && s.name === name; });
        if (idx > -1) {
            selectedCities.splice(idx, 1);
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
            var timeStr = now.toLocaleTimeString('en-US', {
                timeZone: city.tz,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: is12Hour,
            });
            var dateStr = now.toLocaleDateString('ar-SA', {
                timeZone: city.tz,
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            });

            html +=
                '<div class="clock-cell" style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); text-align:center;">' +
                '  <div class="clock-city" style="color: var(--accent); font-weight: bold; font-size: 0.8rem;">' + city.name + '</div>' +
                '  <div class="clock-time" style="font-family: var(--font-mono); font-size: 1rem; margin: 2px 0; color:#fff;">' + timeStr + '</div>' +
                '  <div class="clock-date" style="font-size: 0.65rem; color: var(--text-secondary);">' + dateStr + '</div>' +
                '</div>';
        });

        // Responsive grid adjustment
        var cols = selectedCities.length > 2 ? '1fr 1fr' : '1fr';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = cols;
        container.style.gap = '8px';
        container.innerHTML = html;
    }

    return { render: render, init: init, toggleCity: toggleCity };
})();
