/* ═══════════════════════════════════════════════
   MILITARY AIRCRAFT TRACKER WIDGET
   ═══════════════════════════════════════════════ */

var MilitaryAircraftWidget = (function () {
    var types = [
        { label: 'MIL', count: 375, desc: 'عسكري' },
        { label: 'BOMB', count: 8, desc: 'قاذفة' },
        { label: 'VIP', count: 8, desc: 'شخصيات' },
        { label: 'SQK', count: 2, desc: 'طوارئ' },
        { label: 'HELI', count: 58, desc: 'مروحية' },
    ];

    var flights = [
        { callsign: 'CNVS402', type: 'MIL', alt: '35,020ft', region: 'الولايات المتحدة' },
        { callsign: 'CNVS196', type: 'MIL', alt: '3,660ft', region: 'الولايات المتحدة' },
        { callsign: 'CNV3208', type: 'MIL', alt: '30,751ft', region: 'المحيط الأطلسي' },
        { callsign: 'CNVS527', type: 'MIL', alt: '25,020ft', region: 'أوروبا' },
        { callsign: 'FORTE12', type: 'VIP', alt: '55,000ft', region: 'البحر الأسود' },
        { callsign: 'LAGR233', type: 'BOMB', alt: '28,500ft', region: 'الشرق الأوسط' },
        { callsign: 'DUKE51', type: 'MIL', alt: '18,200ft', region: 'الخليج العربي' },
        { callsign: 'REACH441', type: 'MIL', alt: '31,000ft', region: 'المحيط الهندي' },
    ];

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>✈️</span><span>الطائرات العسكرية</span></div>' +
                '  <div class="widget-actions"><span class="widget-badge badge-count">24h</span></div>' +
                '</div>',
            body: '<div class="widget-body" id="military-aircraft-body"></div>',
        };
    }

    function init() {
        var container = document.getElementById('military-aircraft-body');
        if (!container) return;

        var summaryHtml = '<div class="aircraft-summary">';
        types.forEach(function (t) {
            summaryHtml +=
                '<div class="aircraft-type">' +
                '  <div class="aircraft-type-label">' + t.label + '</div>' +
                '  <div class="aircraft-type-count">' + t.count + '</div>' +
                '</div>';
        });
        summaryHtml += '</div>';

        var listHtml = '';
        flights.forEach(function (f) {
            listHtml +=
                '<div class="aircraft-list-item">' +
                '  <span class="aircraft-callsign">' + f.callsign + ' <span class="widget-badge badge-count">' + f.type + '</span></span>' +
                '  <span class="aircraft-info">' + f.alt + '</span>' +
                '  <span style="font-size:0.7rem;color:var(--text-muted);">📍 ' + f.region + '</span>' +
                '</div>';
        });

        container.innerHTML = summaryHtml + listHtml;
    }

    return { render: render, init: init };
})();
