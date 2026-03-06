/* ═══════════════════════════════════════════════
   SANCTIONS & TRADE WIDGET
   ═══════════════════════════════════════════════ */

var SanctionsTradeWidget = (function () {
    var stats = [
        { label: 'عقوبات', value: '1,882', icon: '🚫' },
        { label: 'تدفق تجاري', value: '686,587', icon: '🚢' },
        { label: 'تصدير', value: '245,112', icon: '📦' },
        { label: 'تنفيذ', value: '13', icon: '⚖️' },
    ];

    var recentActions = [
        { text: 'الاتحاد الأوروبي يفرض عقوبات جديدة على 12 كياناً روسياً', time: 'منذ ساعة' },
        { text: 'واشنطن تضيف 8 شركات إيرانية إلى القائمة السوداء', time: 'منذ 3 ساعات' },
        { text: 'بريطانيا تجمد أصول مجموعة فاغنر في أفريقيا', time: 'منذ 5 ساعات' },
        { text: 'الصين ترد على الرسوم الجمركية الأمريكية الجديدة بفرض قيود تصدير', time: 'منذ 8 ساعات' },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>🚫</span><span>العقوبات والتجارة</span></div>' +
                '</div>',
            body: '<div class="widget-body" id="sanctions-trade-body"></div>',
        };
    }

    function init() {
        var container = document.getElementById('sanctions-trade-body');
        if (!container) return;

        var html = '<div class="stat-row">';
        stats.forEach(function (s) {
            html +=
                '<div class="stat-card">' +
                '  <div class="stat-value">' + s.value + '</div>' +
                '  <div class="stat-label">' + s.icon + ' ' + s.label + '</div>' +
                '</div>';
        });
        html += '</div>';

        recentActions.forEach(function (a) {
            html +=
                '<div class="conflict-item">' +
                '  <div class="conflict-headline">' + a.text + '</div>' +
                '  <div class="conflict-meta"><span>' + a.time + '</span></div>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    return { render: render, init: init };
})();
