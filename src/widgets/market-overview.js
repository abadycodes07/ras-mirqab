/* ═══════════════════════════════════════════════
   MARKET OVERVIEW WIDGET
   ═══════════════════════════════════════════════ */

var MarketOverviewWidget = (function () {
    var defaultSymbols = [
        { "s": "CME_MINI:ES1!", "d": "S&P 500" },
        { "s": "CME_MINI:NQ1!", "d": "Nasdaq 100" },
        { "s": "CBOT_MINI:YM1!", "d": "Dow Jones" },
        { "s": "CBOE:VIX", "d": "VIX" },
        { "s": "OANDA:UK100GBP", "d": "FTSE 100" },
        { "s": "OANDA:DE30EUR", "d": "DAX" }
    ];

    function getSelectedSymbols() {
        try {
            var raw = localStorage.getItem('rasmirqab_market_symbols');
            return raw ? JSON.parse(raw) : defaultSymbols;
        } catch(e) { return defaultSymbols; }
    }

    function saveSymbols(symbols) {
        localStorage.setItem('rasmirqab_market_symbols', JSON.stringify(symbols));
    }

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title"><span>📈</span><span>الأصول والعملات / ASSETS</span></div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="market-settings-btn" title="إعدادات الأصول">⚙</button>' +
                '  </div>' +
                '</div>',
            body: '<div class="widget-body" id="market-overview-body" style="padding:0; overflow:hidden;"></div>',
        };
    }

    function init() {
        var container = document.getElementById('market-overview-body');
        if (!container) return;

        var settingsBtn = document.getElementById('market-settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = function() {
                if (window.RasMirqabModal) window.RasMirqabModal.open('market-settings-modal');
            };
        }

        // Search logic in modal
        var searchBtn = document.getElementById('btn-search-market');
        var searchInput = document.getElementById('market-symbol-search');
        if (searchBtn && searchInput) {
            searchBtn.onclick = function() { performSearch(searchInput.value.trim()); };
            searchInput.onkeydown = function(e) { if (e.key === 'Enter') performSearch(searchInput.value.trim()); };
        }

        updateWidget();
    }

    function updateWidget() {
        var container = document.getElementById('market-overview-body');
        if (!container) return;
        container.innerHTML = '';

        var symbols = getSelectedSymbols();
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
                    "title": "المختارة",
                    "symbols": symbols,
                    "originalTitle": "Portfolio"
                }
            ]
        });

        wrapper.appendChild(script);
        container.appendChild(wrapper);
    }

    // Mock search for TradingView symbols
    function performSearch(query) {
        if (!query) return;
        var resultsContainer = document.getElementById('market-search-results');
        if (!resultsContainer) return;

        // Since we can't easily poll TradingView API without a key/CORS, 
        // we offer a direct "Add by Symbol" feature which is common for TV embeds.
        var symbol = query.toUpperCase();
        var html = 
            '<div class="channel-card" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(230,126,34,0.05); border:1px solid var(--accent-dim);">' +
            '  <div>' +
            '    <div style="font-weight:700; color:var(--accent);">' + symbol + '</div>' +
            '    <div style="font-size:10px; color:#666;">اضغط للإضافة إلى القائمة</div>' +
            '  </div>' +
            '  <button onclick="MarketOverviewWidget.addSymbol(\'' + symbol + '\')" style="background:var(--accent); color:#000; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-weight:700;">+ إضافة</button>' +
            '</div>';
        resultsContainer.innerHTML = html;
    }

    function addSymbol(symbol) {
        var current = getSelectedSymbols();
        if (!current.some(function(s) { return s.s === symbol; })) {
            current.push({ "s": symbol, "d": symbol });
            saveSymbols(current);
            renderModalList();
            updateWidget();
        }
    }

    function removeSymbol(symbol) {
        var current = getSelectedSymbols();
        var filtered = current.filter(function(s) { return s.s !== symbol; });
        saveSymbols(filtered);
        renderModalList();
        updateWidget();
    }

    function renderModalList() {
        var activeContainer = document.getElementById('active-market-symbols');
        if (!activeContainer) return;
        var symbols = getSelectedSymbols();
        var html = '';
        symbols.forEach(function(s) {
            html += 
                '<div class="channel-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">' +
                '  <div style="font-size:12px; font-weight:600; color:#fff;">' + s.s + '</div>' +
                '  <button onclick="MarketOverviewWidget.removeSymbol(\'' + s.s + '\')" style="background:rgba(231,76,60,0.1); border:1px solid rgba(231,76,60,0.2); color:#ff4d4d; border-radius:4px; padding:2px 8px; cursor:pointer; font-size:10px;">✕ حذف</button>' +
                '</div>';
        });
        activeContainer.innerHTML = html;
    }

    return { render: render, init: init, addSymbol: addSymbol, removeSymbol: removeSymbol, renderModalList: renderModalList };
})();
