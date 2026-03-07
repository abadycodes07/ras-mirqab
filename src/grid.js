/* ═══════════════════════════════════════════════
   GRIDSTACK LAYOUT MANAGER
   Handles draggable/resizable widget grid
   ═══════════════════════════════════════════════ */

var RasMirqabGrid = (function () {
    var grid = null;

    // Widget definitions: id, module, grid position
    var widgetDefs = [
        // Top row (Totals 12 width)
        { id: 'live-tv', module: LiveTVWidget, x: 0, y: 0, w: 4, h: 4, title: 'البث المباشر' },
        { id: 'gold-silver', module: GoldSilverWidget, x: 4, y: 0, w: 2, h: 4, title: 'الذهب والفضة' },
        { id: 'world-clock', module: WorldClockWidget, x: 6, y: 0, w: 2, h: 4, title: 'الساعة العالمية' },
        { id: 'breaking-news', module: BreakingNewsWidget, x: 8, y: 0, w: 4, h: 4, title: 'عاجل' },

        // Second row
        { id: 'market-overview', module: MarketOverviewWidget, x: 0, y: 4, w: 4, h: 2, title: 'الأسواق' },
        { id: 'live-webcams', module: LiveWebcamsWidget, x: 4, y: 4, w: 5, h: 6, title: 'الكاميرات المباشرة' },
        { id: 'conflict-monitor', module: ConflictMonitorWidget, x: 9, y: 4, w: 3, h: 3, title: 'رصد النزاعات' },

        // Third row and beyond
        { id: 'commodities', module: CommoditiesWidget, x: 0, y: 6, w: 4, h: 2, title: 'السلع' },
        { id: 'sanctions-trade', module: SanctionsTradeWidget, x: 0, y: 8, w: 4, h: 2, title: 'العقوبات والتجارة' },
        { id: 'military-aircraft', module: MilitaryAircraftWidget, x: 9, y: 7, w: 3, h: 3, title: 'الطائرات العسكرية' },
        { id: 'cyber-intel', module: CyberIntelWidget, x: 4, y: 10, w: 4, h: 2, title: 'الاستخبارات السيبرانية' },
        { id: 'health-bio', module: HealthBioWidget, x: 8, y: 10, w: 4, h: 2, title: 'الصحة والأمن الحيوي' },
    ];

    function init() {
        if (typeof GridStack === 'undefined') {
            console.warn('GridStack not loaded');
            initFallback();
            return;
        }

        // Force clear layout to apply new sizes
        localStorage.removeItem('rasmirqab_layout');

        // We changed the grid to 24 columns, old layouts WILL CRASH
        // Force reset the layout every time for now until it's stable.
        localStorage.removeItem('rasmirqab_layout');
        var savedLayout = null; // Ignore saved layout completely

        var gridElement = document.getElementById('widget-grid');
        if (!gridElement) {
            console.error('Widget grid element not found');
            return;
        }

        grid = GridStack.init({
            column: 12,
            cellHeight: 85,
            margin: 6,
            animate: true,
            float: false,
            draggable: { handle: '.widget-header' },
            resizable: { handles: 'se, sw' },
        }, gridElement);

        // Add widgets
        widgetDefs.forEach(function (def) {
            try {
                var content = def.module.render();
                var html = content.header + content.body;

                grid.addWidget({
                    id: def.id,
                    x: def.x,
                    y: def.y,
                    w: def.w,
                    h: def.h,
                    content: html,
                });
            } catch (err) {
                console.error('Failed to add widget:', def.id, err);
            }
        });

        // Initialize widget logic after DOM is ready
        setTimeout(function () {
            widgetDefs.forEach(function (def) {
                if (def.module && def.module.init) {
                    def.module.init();
                }
            });
        }, 100);

        // Save layout on change
        grid.on('change', function () {
            saveLayout();
        });
    }

    function saveLayout() {
        if (!grid) return;
        try {
            var items = grid.getGridItems().map(function (el) {
                var node = el.gridstackNode;
                return {
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    w: node.w,
                    h: node.h,
                };
            });
            localStorage.setItem('rasmirqab_layout', JSON.stringify(items));
        } catch (e) { }
    }

    function resetLayout() {
        localStorage.removeItem('rasmirqab_layout');
        location.reload();
    }

    // Fallback if GridStack fails to load
    function initFallback() {
        var container = document.getElementById('widget-grid');
        if (!container) return;

        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
        container.style.gap = '10px';

        widgetDefs.forEach(function (def) {
            var content = def.module.render();
            var div = document.createElement('div');
            div.className = 'fallback-widget';
            div.style.cssText = 'background:var(--glass-bg);backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:10px;overflow:hidden;';
            div.innerHTML = content.header + content.body;
            container.appendChild(div);
        });

        setTimeout(function () {
            widgetDefs.forEach(function (def) {
                if (def.module && def.module.init) def.module.init();
            });
        }, 100);
    }

    return {
        init: init,
        resetLayout: resetLayout,
    };
})();
