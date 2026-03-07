/* ═══════════════════════════════════════════════
   GOLD & SILVER vs DOLLAR WIDGET
   ═══════════════════════════════════════════════ */

    var selectedAssets = [];
    var ALL_ASSETS = [
        { name: 'الذهب (XAU/USD)', symbol: 'OANDA:XAUUSD', icon: '🥇' },
        { name: 'الفضة (XAG/USD)', symbol: 'OANDA:XAGUSD', icon: '🥈' },
        { name: 'اليورو دولار (EUR/USD)', symbol: 'FX:EURUSD', icon: '🇪🇺' },
        { name: 'النفط الخام (UK Oil)', symbol: 'TVC:UKOIL', icon: '🛢' },
        { name: 'النازداك (NQ1!)', symbol: 'CME_MINI:NQ1!', icon: '📈' }
    ];

    function getSelected() {
        try {
            var raw = localStorage.getItem('rasmirqab_selected_assets');
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return [
            { name: 'الذهب (XAU/USD)', symbol: 'OANDA:XAUUSD' },
            { name: 'الفضة (XAG/USD)', symbol: 'OANDA:XAGUSD' }
        ];
    }

    function saveSelected(arr) {
        localStorage.setItem('rasmirqab_selected_assets', JSON.stringify(arr));
        selectedAssets = arr;
    }

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">' +
                '    <span>💰</span>' +
                '    <span>الأصول والعملات</span>' +
                '  </div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" id="gold-silver-settings-btn" title="إدارة الأصول">⚙</button>' +
                '  </div>' +
                '</div>',
            body: 
                '<div id="gold-settings-panel" style="display:none; padding:12px; background:rgba(10,10,10,0.98); border:1px solid #f1c40f; border-radius:8px; z-index:1000; position:relative; margin:10px;">' +
                '  <div style="font-size:11px; color:#f1c40f; font-weight:700; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">اختر الأصول للمتابعة / ASSETS</div>' +
                '  <div id="gold-selection-list" style="display:grid; grid-template-columns:1fr; gap:6px;"></div>' +
                '</div>' +
                '<div class="widget-body" id="gold-silver-body" style="padding:0; display:flex; flex-direction:column; height:100%; overflow:hidden;"></div>',
        };
    }

    function init() {
        selectedAssets = getSelected();
        
        var settingsBtn = document.getElementById('gold-silver-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', toggleSettings);
        }

        updateWidgets();
    }

    var settingsOpen = false;
    function toggleSettings() {
        settingsOpen = !settingsOpen;
        var panel = document.getElementById('gold-settings-panel');
        if (panel) panel.style.display = settingsOpen ? 'block' : 'none';
        if (settingsOpen) renderSettings();
    }

    function renderSettings() {
        var container = document.getElementById('gold-selection-list');
        if (!container) return;

        var html = '';
        ALL_ASSETS.forEach(function(asset) {
            var isSelected = selectedAssets.some(function(s) { return s.symbol === asset.symbol; });
            var activeClass = isSelected ? 'background:#f1c40f; color:#000;' : 'background:#222; color:#888;';
            
            html += '<div style="' + activeClass + ' padding:8px; border-radius:4px; font-size:11px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:0.2s;" ' +
                    'onclick="GoldSilverWidget.toggleAsset(\'' + asset.name + '\',\'' + asset.symbol + '\')">' +
                    '<span>' + asset.icon + ' ' + asset.name + '</span>' +
                    (isSelected ? '<span>✔</span>' : '') + '</div>';
        });
        container.innerHTML = html;
    }

    function toggleAsset(name, symbol) {
        var idx = selectedAssets.findIndex(function(s) { return s.symbol === symbol; });
        if (idx > -1) {
            if (selectedAssets.length > 1) selectedAssets.splice(idx, 1);
        } else {
            if (selectedAssets.length < 4) selectedAssets.push({ name: name, symbol: symbol });
        }
        saveSelected(selectedAssets);
        renderSettings();
        updateWidgets();
    }

    function updateWidgets() {
        var container = document.getElementById('gold-silver-body');
        if (!container) return;

        container.innerHTML = ''; // Clear

        selectedAssets.forEach(function(asset, i) {
            var wrapper = document.createElement('div');
            wrapper.className = 'tradingview-widget-container tv-asset-' + i;
            wrapper.style.flex = '1';
            wrapper.style.minHeight = (100 / selectedAssets.length) + '%';
            if (i > 0) wrapper.style.borderTop = '1px solid rgba(255,255,255,0.05)';
            wrapper.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';
            
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
            script.async = true;
            script.innerHTML = JSON.stringify({
                "symbol": asset.symbol,
                "width": "100%",
                "height": "100%",
                "locale": "ar_AE",
                "dateRange": "1D",
                "colorTheme": "dark",
                "isTransparent": true,
                "autosize": true,
                "largeChartUrl": ""
            });
            wrapper.appendChild(script);
            container.appendChild(wrapper);
        });
    }

    return { render: render, init: init, toggleAsset: toggleAsset };
})();
