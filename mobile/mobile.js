/* ═══════════════════════════════════════════════
   RAS MIRQAB - MOBILE CORE LOGIC
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    console.log('[Mobile] Initializing App...');

    // 1. Initialize Global Globe (Shared with Desktop)
    if (window.RasMirqabGlobe) {
        RasMirqabGlobe.init();
        startPOVSync();
    }

    // 2. Initialize Breaking News Widget (Shared)
    if (window.BreakingNewsWidget) {
        var newsContainer = document.getElementById('news-list');
        if (newsContainer) {
            var ui = BreakingNewsWidget.render();
            newsContainer.innerHTML = ui.body;
            BreakingNewsWidget.init();
        }
    }

    // 3. Header Clock
    updateHeaderClock();
    setInterval(updateHeaderClock, 1000);

    // 4. Bell Icon (Hide Everything)
    var bellBtn = document.getElementById('btn-notifications-mobile');
    if (bellBtn) {
        bellBtn.onclick = function() {
            document.body.classList.toggle('hide-everything');
            bellBtn.classList.toggle('active');
            
            // If hiding, maybe zoom in on globe
            if (document.body.classList.contains('hide-everything')) {
                 console.log('[Mobile] Hide Everything active - Map Focus');
            }
        };
    }

    // 5. 2D/3D Toggles
    var btn3d = document.getElementById('btn-3d');
    var btn2d = document.getElementById('btn-2d');
    if (btn3d && btn2d) {
        btn3d.onclick = function() { 
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.toggle(); 
                btn3d.classList.add('active');
                btn2d.classList.remove('active');
            }
        };
        btn2d.onclick = function() {
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.toggle();
                btn2d.classList.add('active');
                btn3d.classList.remove('active');
            }
        };
    }

    // 6. Hard Sync Button
    var syncBtn = document.getElementById('btn-hard-sync');
    if (syncBtn) {
        syncBtn.onclick = function() {
            location.reload();
        };
    }
}

function updateHeaderClock() {
    var el = document.getElementById('mobile-header-clock');
    if (!el) return;
    var now = new Date();
    var opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' };
    el.textContent = 'KSA ' + now.toLocaleTimeString('en-GB', opts);
}

/* ═══ GLOBE POV SYNC ═══ */
var lastPOV = null;
var isRemoteUpdate = false;

function startPOVSync() {
    console.log('[Mobile] Starting POV Sync...');

    // Poll for remote changes every 1.5 seconds
    const syncHost = window.location.hostname || 'localhost';
    setInterval(function() {
        if (document.hidden) return; // Save battery if tab hidden
        
        fetch(`http://${syncHost}:3001/sync`)
            .then(r => r.json())
            .then(data => {
                if (data.pov && JSON.stringify(data.pov) !== JSON.stringify(lastPOV)) {
                    console.log('[Sync] Applying remote POV');
                    lastPOV = data.pov;
                    isRemoteUpdate = true;
                    if (window.RasMirqabGlobe && typeof window.RasMirqabGlobe.setPOV === 'function') {
                        window.RasMirqabGlobe.setPOV(data.pov);
                    }
                    setTimeout(() => { isRemoteUpdate = false; }, 500);
                }
            }).catch(() => {});
    }, 1500);
}
