/* ═══════════════════════════════════════════════
   WORLD CLOCK WIDGET
   ═══════════════════════════════════════════════ */

var WorldClockWidget = (function () {
    var is12Hour = true;

    var cities = [
        { name: 'الرياض', tz: 'Asia/Riyadh' },
        { name: 'أبو ظبي', tz: 'Asia/Dubai' },
        { name: 'نيويورك', tz: 'America/New_York' },
        { name: 'لندن', tz: 'Europe/London' }
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">' +
                '    <span>🌐</span>' +
                '    <span>توقيت العالم</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="world-clock-format-btn" title="تبديل 12/24 ساعة">' +
                '       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
                '    </button>' +
                '  </div>' +
                '</div>',
            body: '<div class="widget-body"><div class="clock-grid" id="clock-grid"></div></div>',
        };
    }

    function init() {
        var btn = document.getElementById('world-clock-format-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                is12Hour = !is12Hour;
                updateClocks();
            });
        }
        updateClocks();
        setInterval(updateClocks, 1000);
    }

    function updateClocks() {
        var container = document.getElementById('clock-grid');
        if (!container) return;

        var html = '';
        var now = new Date();

        cities.forEach(function (city) {
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
                '<div class="clock-cell" style="background: var(--bg-secondary); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);">' +
                '  <div class="clock-city" style="color: var(--accent); font-weight: bold; font-size: 0.9rem;">' + city.name + '</div>' +
                '  <div class="clock-time" style="font-family: var(--font-mono); font-size: 1.1rem; margin: 4px 0;">' + timeStr + '</div>' +
                '  <div class="clock-date" style="font-size: 0.75rem; color: var(--text-secondary);">' + dateStr + '</div>' +
                '</div>';
        });

        // Add CSS to clock-grid specifically since we added inline styles to cells
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr';
        container.style.gap = '8px';
        container.innerHTML = html;
    }

    return { render: render, init: init };
})();
