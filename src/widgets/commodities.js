/* ═══════════════════════════════════════════════
   COMMODITIES WIDGET
   ═══════════════════════════════════════════════ */

var CommoditiesWidget = (function () {
    var commodities = [
        { name: 'GOLD', nameAr: 'الذهب', price: 2943.50, change: +28.40, pct: '+0.97%', color: '#FFD700', history: [2890, 2905, 2880, 2920, 2915, 2930, 2943] },
        { name: 'BRENT', nameAr: 'برنت', price: 76.17, change: +2.32, pct: '+3.14%', color: '#3498db', history: [72, 73.5, 74, 73.8, 75, 75.5, 76.17] },
        { name: 'SILVER', nameAr: 'الفضة', price: 32.85, change: +0.45, pct: '+1.39%', color: '#C0C0C0', history: [31.5, 31.8, 32, 31.9, 32.3, 32.6, 32.85] },
        { name: 'WTI', nameAr: 'نفط خام', price: 72.50, change: -1.20, pct: '-1.63%', color: '#e67e22', history: [74, 73.8, 73.5, 73, 72.8, 72.6, 72.5] },
        { name: 'PLATINUM', nameAr: 'بلاتين', price: 945.91, change: -3.50, pct: '-0.37%', color: '#bdc3c7', history: [950, 948, 947, 946, 945, 946, 945.91] },
        { name: 'COPPER', nameAr: 'نحاس', price: 5.94, change: +0.12, pct: '+2.06%', color: '#e67e22', history: [5.7, 5.75, 5.8, 5.82, 5.85, 5.9, 5.94] },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>📊</span><span>السلع</span></div>' +
                '  <div class="widget-actions"><button class="widget-action-btn" title="تحديث">↻</button></div>' +
                '</div>',
            body: '<div class="widget-body"><div class="commodity-grid" id="commodities-grid"></div></div>',
        };
    }

    function init() {
        var container = document.getElementById('commodities-grid');
        if (!container) return;

        var html = '';
        commodities.forEach(function (c) {
            var cls = c.change >= 0 ? 'change-up' : 'change-down';
            var arrow = c.change >= 0 ? '▲' : '▼';
            html +=
                '<div class="commodity-card">' +
                '  <div class="commodity-name">' + c.name + '</div>' +
                '  <div class="commodity-price">$' + c.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '</div>' +
                '  <div class="commodity-change ' + cls + '">' + arrow + ' ' + c.pct + '</div>' +
                '  <div class="commodity-sparkline">' + sparkline(c.history, c.color) + '</div>' +
                '</div>';
        });
        container.innerHTML = html;
    }

    function sparkline(data, color) {
        var w = 120, h = 24;
        var min = Math.min.apply(null, data), max = Math.max.apply(null, data), r = max - min || 1, s = w / (data.length - 1);
        var pts = data.map(function (v, i) { return (i * s).toFixed(1) + ',' + (h - ((v - min) / r) * (h - 4) - 2).toFixed(1); }).join(' ');
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="1.5" points="' + pts + '"/></svg>';
    }

    return { render: render, init: init };
})();
