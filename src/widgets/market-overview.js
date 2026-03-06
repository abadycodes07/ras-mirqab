/* ═══════════════════════════════════════════════
   MARKET OVERVIEW WIDGET
   ═══════════════════════════════════════════════ */

var MarketOverviewWidget = (function () {
    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>📈</span><span>نظرة عامة على الأسواق (حية)</span></div>' +
                '</div>',
            body: '<div class="widget-body" id="market-overview-body" style="padding:0; overflow:hidden;"></div>',
        };
    }

    function init() {
        var container = document.getElementById('market-overview-body');
        if (!container) return;

        container.innerHTML = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'tradingview-widget-container';
        wrapper.style.height = '100%';
        wrapper.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%; width:100%;"></div>';

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            "colorTheme": "dark",
            "dateRange": "1D",
            "showChart": true,
            "locale": "ar_AE",
            "width": "100%",
            "height": "100%",
            "largeChartUrl": "",
            "isTransparent": true,
            "showSymbolLogo": true,
            "showFloatingTooltip": false,
            "tabs": [
                {
                    "title": "المؤشرات العالمية",
                    "symbols": [
                        { "s": "CME_MINI:ES1!", "d": "S&P 500" },
                        { "s": "CME_MINI:NQ1!", "d": "Nasdaq 100" },
                        { "s": "CBOT_MINI:YM1!", "d": "Dow Jones" },
                        { "s": "CBOE:VIX", "d": "VIX" },
                        { "s": "OANDA:UK100GBP", "d": "FTSE 100" },
                        { "s": "OANDA:DE30EUR", "d": "DAX" }
                    ],
                    "originalTitle": "Indices"
                }
            ]
        });

        wrapper.appendChild(script);
        container.appendChild(wrapper);
    }

    return { render: render, init: init };
})();
