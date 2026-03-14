/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = localStorage.getItem('rasmirqab_clock_12h') !== 'false';
    var selectedCities = [];
    var searchQuery = '';

    function getCitiesDatabase() {
        return window.WORLD_CITIES || [];
    }

    function getSelected() {
        try {
            var raw = localStorage.getItem('rasmirqab_selected_clocks');
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.length > 0) return parsed;
            }
        } catch(e) {}
        // Default to: Riyadh, Abu Dhabi, London, New York
        var db = getCitiesDatabase();
        return [
            db[0] || { name: 'الرياض', tz: 'Asia/Riyadh' },
            db[4] || { name: 'أبو ظبي', tz: 'Asia/Dubai' },
            db[25] || { name: 'لندن', tz: 'Europe/London' },
            db[41] || { name: 'نيويورك', tz: 'America/New_York' }
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
                '    <span>توقيت العالم / WORLD CLOCK</span>' +
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
            settingsBtn.onclick = function() {
                if (window.RasMirqabModal) window.RasMirqabModal.open('world-clock-modal');
            };
        }

        var searchInput = document.getElementById('city-search');
        if (searchInput) {
            searchInput.oninput = function(e) {
                searchQuery = e.target.value.toLowerCase();
                renderModalList();
            };
        }

        updateClocks();
        setInterval(updateClocks, 1000);
    }

    function renderModalList() {
        var resultsGroup = document.getElementById('world-clock-results');
        if (!resultsGroup) return;

        var db = getCitiesDatabase();
        var filtered = db.filter(function(city) {
            var q = searchQuery.toLowerCase();
            return city.name.toLowerCase().includes(q) || 
                   city.nameEn.toLowerCase().includes(q) ||
                   city.country.toLowerCase().includes(q) ||
                   city.countryEn.toLowerCase().includes(q);
        });

        // Limit results to 50 for performance
        var limit = 50;
        var display = filtered.slice(0, limit);

        var html = '';
        display.forEach(function(city) {
            var isSelected = selectedCities.some(function(s) { return s.tz === city.tz && s.name === city.name; });
            
            html +=
                '<div class="channel-card ' + (isSelected ? 'selected' : '') + '" onclick="WorldClockWidget.toggleCity(\'' + city.name.replace(/'/g, "\\'") + '\',\'' + city.tz + '\')">' +
                '  <div class="channel-card-info" style="flex:1;">' +
                '    <div class="channel-avatar" style="background:var(--accent-dim); color:var(--accent);">' + city.name[0] + '</div>' +
                '    <div class="channel-name-v">' +
                '      <span class="ch-title">' + city.name + ' <span style="font-size:10px; opacity:0.6;">(' + city.nameEn + ')</span></span>' +
                '      <span class="ch-handle">' + city.country + ' | ' + city.countryEn.toUpperCase() + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="ch-status-icon">' +
                (isSelected ? '<span class="ch-check">✓</span>' : '<span class="ch-add-icon">+</span>') +
                '  </div>' +
                '</div>';
        });

        if (display.length === 0) {
            html = '<div style="color:var(--text-muted); text-align:center; padding:20px; font-size:12px;">لم يتم العثور على نتائج.</div>';
        }

        resultsGroup.innerHTML = html;
    }

    function toggleCity(name, tz) {
        var idx = selectedCities.findIndex(function(s) { return s.tz === tz && s.name === name; });
        if (idx > -1) {
            if (selectedCities.length > 1) selectedCities.splice(idx, 1);
        } else {
            var db = getCitiesDatabase();
            var city = db.find(function(c) { return c.tz === tz && c.name === name; });
            if (city) selectedCities.push(city);
        }
        saveSelected(selectedCities);
        renderModalList();
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

    return { render: render, init: init, toggleCity: toggleCity, renderModalList: renderModalList };
})();
