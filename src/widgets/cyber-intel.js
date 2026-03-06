/* ═══════════════════════════════════════════════
   CYBER INTELLIGENCE WIDGET
   ═══════════════════════════════════════════════ */

var CyberIntelWidget = (function () {
    var chips = [
        { label: 'تنبيهات', count: 84, icon: '🔔' },
        { label: 'مفاتيح', count: 79, icon: '🔑' },
        { label: 'انقطاعات', count: 12, icon: '🌐' },
        { label: 'BGP', count: 5, icon: '🔗' },
        { label: 'IOC', count: 125, icon: '🦠' },
    ];

    var threats = [
        { text: 'CVE-2026-0215 — ثغرة حرجة في Apache Struts تُستغل بنشاط', severity: 'critical' },
        { text: 'هجوم DDoS واسع النطاق يستهدف البنية التحتية الأوكرانية', severity: 'high' },
        { text: 'مجموعة APT41 تستهدف منشآت طاقة في الخليج العربي', severity: 'high' },
        { text: 'تسريب بيانات 2 مليون مستخدم من منصة مالية خليجية', severity: 'medium' },
        { text: 'انقطاع إنترنت واسع في السودان مع تصاعد القتال', severity: 'high' },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>🛡️</span><span>الاستخبارات السيبرانية</span></div>' +
                '  <div class="widget-actions"><span class="widget-badge badge-count">' + chips.reduce(function (a, c) { return a + c.count; }, 0) + '</span></div>' +
                '</div>',
            body: '<div class="widget-body" id="cyber-intel-body"></div>',
        };
    }

    function init() {
        var container = document.getElementById('cyber-intel-body');
        if (!container) return;

        var html = '<div class="cyber-chip-row">';
        chips.forEach(function (c) {
            html += '<div class="cyber-chip">' + c.icon + ' ' + c.label + ' <span class="chip-count">' + c.count + '</span></div>';
        });
        html += '</div>';

        threats.forEach(function (t) {
            var color = t.severity === 'critical' ? '#e74c3c' : t.severity === 'high' ? '#f39c12' : '#3498db';
            html +=
                '<div class="conflict-item">' +
                '  <div class="conflict-headline"><span style="color:' + color + ';font-weight:700;">●</span> ' + t.text + '</div>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    return { render: render, init: init };
})();
