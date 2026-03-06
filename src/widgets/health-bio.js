/* ═══════════════════════════════════════════════
   HEALTH & BIOSECURITY WIDGET
   ═══════════════════════════════════════════════ */

var HealthBioWidget = (function () {
    var tabs = ['أوبئة', 'استدعاءات', 'أدوية', 'مياه الصرف'];

    var stats = [
        { label: 'حالات عالمية', value: '784,753,890' },
        { label: 'حالات نشطة', value: '22,123,398' },
    ];

    var alerts = [
        { text: 'تفشي إنفلونزا الطيور H5N1 في مزارع دواجن بمصر', severity: 'high' },
        { text: 'منظمة الصحة العالمية تحذر من متحور جديد لكوفيد-19', severity: 'medium' },
        { text: 'حالات حمى الضنك ترتفع 300% في جنوب شرق آسيا', severity: 'high' },
        { text: 'استدعاء عاجل لدواء ملوث في السوق الأوروبية', severity: 'medium' },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>🏥</span><span>الصحة والأمن الحيوي</span></div>' +
                '</div>',
            body: '<div class="widget-body" id="health-bio-body"></div>',
        };
    }

    function init() {
        var container = document.getElementById('health-bio-body');
        if (!container) return;

        var tabsHtml = '<div class="conflict-tabs">';
        tabs.forEach(function (t, i) {
            tabsHtml += '<button class="conflict-tab' + (i === 0 ? ' active' : '') + '">' + t + '</button>';
        });
        tabsHtml += '</div>';

        var statsHtml = '<div class="health-stats">';
        stats.forEach(function (s) {
            statsHtml +=
                '<div class="health-stat">' +
                '  <div class="stat-value">' + s.value + '</div>' +
                '  <div class="stat-label">' + s.label + '</div>' +
                '</div>';
        });
        statsHtml += '</div>';

        var alertsHtml = '';
        alerts.forEach(function (a) {
            var color = a.severity === 'high' ? '#e74c3c' : '#f39c12';
            alertsHtml +=
                '<div class="conflict-item">' +
                '  <div class="conflict-headline"><span style="color:' + color + ';">●</span> ' + a.text + '</div>' +
                '</div>';
        });

        container.innerHTML = tabsHtml + statsHtml + alertsHtml;
    }

    return { render: render, init: init };
})();
