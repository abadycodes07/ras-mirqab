/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = localStorage.getItem('rasmirqab_clock_12h') !== 'false';
    var selectedCities = [];
    var settingsOpen = false;

    var ALL_CITIES = [
        { name: 'الرياض', tz: 'Asia/Riyadh', country: 'السعودية' },
        { name: 'أبو ظبي', tz: 'Asia/Dubai', country: 'الإمارات' },
        { name: 'الكويت', tz: 'Asia/Kuwait', country: 'الكويت' },
        { name: 'نيويورك', tz: 'America/New_York', country: 'أمريكا' }
    ];

    function getSelected() {
        try {
            var raw = localStorage.getItem('rasmirqab_selected_clocks');
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return ALL_CITIES; // Default to all 4
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
