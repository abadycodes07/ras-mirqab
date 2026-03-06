/* ═══════════════════════════════════════════════
   GOLD & SILVER vs DOLLAR WIDGET
   ═══════════════════════════════════════════════ */

var GoldSilverWidget = (function () {
    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">' +
                '    <span>🥇</span>' +
                '    <span>الذهب والفضة (أسعار حية)</span>' +
                '  </div>' +
                '</div>',
            body: '<div class="widget-body" id="gold-silver-body" style="padding:0; display:flex; flex-direction:column; height:100%; overflow:hidden;"></div>',
        };
    }

    function init() {
        var container = document.getElementById('gold-silver-body');
        if (!container) return;

        container.innerHTML = ''; // Clear

        // GOLD WIDGET
        var goldWrapper = document.createElement('div');
        goldWrapper.className = 'tradingview-widget-container tv-gold';
        goldWrapper.style.flex = '1';
        goldWrapper.style.height = '50%';
        goldWrapper.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';

        var goldScript = document.createElement('script');
        goldScript.type = 'text/javascript';
        goldScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        goldScript.async = true;
        goldScript.innerHTML = JSON.stringify({
            "symbol": "OANDA:XAUUSD",
            "width": "100%",
            "height": "100%",
            "locale": "ar_AE",
            "dateRange": "1D",
            "colorTheme": "dark",
            "isTransparent": true,
            "autosize": true,
            "largeChartUrl": ""
        });
        goldWrapper.appendChild(goldScript);

        // SILVER WIDGET
        var silverWrapper = document.createElement('div');
        silverWrapper.className = 'tradingview-widget-container tv-silver';
        silverWrapper.style.flex = '1';
        silverWrapper.style.height = '50%';
        silverWrapper.style.borderTop = '1px solid rgba(255,255,255,0.05)';
        silverWrapper.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';

        var silverScript = document.createElement('script');
        silverScript.type = 'text/javascript';
        silverScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        silverScript.async = true;
        silverScript.innerHTML = JSON.stringify({
            "symbol": "OANDA:XAGUSD",
            "width": "100%",
            "height": "100%",
            "locale": "ar_AE",
            "dateRange": "1D",
            "colorTheme": "dark",
            "isTransparent": true,
            "autosize": true,
            "largeChartUrl": ""
        });
        silverWrapper.appendChild(silverScript);

        container.appendChild(goldWrapper);
        container.appendChild(silverWrapper);
    }

    return { render: render, init: init };
})();
