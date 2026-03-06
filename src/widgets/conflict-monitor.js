/* ═══════════════════════════════════════════════
   CONFLICT MONITOR WIDGET
   ═══════════════════════════════════════════════ */

var ConflictMonitorWidget = (function () {
    var categories = [
        { key: 'strikes', label: 'ضربات', count: 256, icon: '💥', cssClass: 'type-strike' },
        { key: 'embargo', label: 'حصار', count: 1, icon: '🚫', cssClass: 'type-embargo' },
        { key: 'siege', label: 'حصار عسكري', count: 3, icon: '⚔️', cssClass: 'type-siege' },
        { key: 'terror', label: 'إرهاب', count: 8, icon: '🎯', cssClass: 'type-terror' },
    ];

    var headlines = [
        { text: 'إيران تعلن إسقاط طائرة مسيّرة غامضة فوق أصفهان', type: 'strike', time: 'منذ ساعتين', region: 'الشرق الأوسط' },
        { text: 'هجوم بطائرة درون إيرانية على فندق في المنامة البحرين', type: 'strike', time: 'منذ 3 ساعات', region: 'الخليج' },
        { text: 'الجيش الأمريكي يعلن تدمير 4 مسيّرات حوثية فوق البحر الأحمر', type: 'strike', time: 'منذ 4 ساعات', region: 'البحر الأحمر' },
        { text: 'تقارير عن تفعيل الدفاعات الجوية في تل أبيب', type: 'strike', time: 'منذ 5 ساعات', region: 'فلسطين' },
        { text: 'اشتباكات عنيفة في الخرطوم بين الجيش السوداني وقوات الدعم السريع', type: 'strike', time: 'منذ 6 ساعات', region: 'أفريقيا' },
        { text: 'الكونغرس يصوّت على إنهاء الملاحة في البحر الأحمر', type: 'embargo', time: 'منذ 8 ساعات', region: 'الولايات المتحدة' },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>⚔️</span><span>رصد النزاعات</span></div>' +
                '  <div class="widget-actions">' +
                '    <span class="widget-badge badge-count">24h</span>' +
                '    <button class="widget-action-btn" title="تحديث">↻</button>' +
                '  </div>' +
                '</div>',
            body: '<div class="widget-body" id="conflict-monitor-body"></div>',
        };
    }

    function init() {
        var container = document.getElementById('conflict-monitor-body');
        if (!container) return;

        var tabsHtml = '<div class="conflict-tabs">';
        categories.forEach(function (cat) {
            tabsHtml +=
                '<button class="conflict-tab active">' +
                cat.icon + ' ' + cat.label + ' (' + cat.count + ')' +
                '</button>';
        });
        tabsHtml += '</div>';

        var itemsHtml = '';
        headlines.forEach(function (h) {
            itemsHtml +=
                '<div class="conflict-item">' +
                '  <div class="conflict-headline">' +
                '    <span class="conflict-type-badge type-' + h.type + '">' + h.type.toUpperCase() + '</span> ' +
                h.text +
                '  </div>' +
                '  <div class="conflict-meta">' +
                '    <span>' + h.time + '</span>' +
                '    <span>📍 ' + h.region + '</span>' +
                '  </div>' +
                '</div>';
        });

        container.innerHTML = tabsHtml + itemsHtml;
    }

    return { render: render, init: init };
})();
