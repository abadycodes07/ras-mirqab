/* ═══════════════════════════════════════════════
   RAS MIRQAB - MOBILE CORE LOGIC (V19: 2026 EDITION)
   ═══════════════════════════════════════════════ */

const MobileApp = {
    activeTV: null,
    isPiPActive: false,
    audioEnabled: localStorage.getItem('rasmirqab_audio_notif') !== 'false',

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V23: CACHE PURGED ---');
        console.log('--- Data Check:', !!window.RasMirqabData, 'Categories:', !!(window.RasMirqabData && window.RasMirqabData.categories));
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
            this.initLayersModal();
        }
        this.initBreakingNews();
        this.initTVCarousel();
        this.initWidgetsGrid();
        this.initDraggablePiP();
        
        // 2. UI Bindings
        this.bindEvents();
        this.initNotificationModal();
        this.initAudioUnlock();
        this.updateBellGlow();
        
        // 3. Initial POV Sync
        if (typeof window.startPOVSync === 'function') window.startPOVSync();

        console.log('--- MOBILE APP V19: READY ---');
    },

    bindEvents: function() {
        // --- Navigation ---
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.scrollToSection(item.dataset.section);
            };
        });

        // --- Map Mode & Toggles ---
        const btn3d = document.getElementById('btn-3d');
        const btn2d = document.getElementById('btn-2d');
        const btnHideMap = document.getElementById('btn-hide-map');

        if (btn3d) btn3d.onclick = () => this.setMapMode('3d');
        if (btn2d) btn2d.onclick = () => this.setMapMode('2d');
        if (btnHideMap) {
            btnHideMap.onclick = () => {
                document.body.classList.add('map-hidden');
                if (btnShowMap) btnShowMap.classList.remove('hidden');
            };
        }

        const btnShowMap = document.getElementById('float-show-map');
        if (btnShowMap) {
            btnShowMap.onclick = () => {
                document.body.classList.remove('map-hidden');
                btnShowMap.classList.add('hidden'); // Hide the bookmark when map is back
            };
        }

        // --- Layers Modal ---
        const btnLayers = document.getElementById('btn-layers');
        const layersModal = document.getElementById('layers-modal');
        const closeLayers = document.getElementById('close-layers');
        if (btnLayers && layersModal) {
            btnLayers.onclick = (e) => {
                e.stopPropagation();
                layersModal.classList.toggle('hidden');
                if (!layersModal.classList.contains('hidden')) this.initLayersModal(); // Refresh content
            };
        }
        if (closeLayers) closeLayers.onclick = () => layersModal.classList.add('hidden');

        // --- Notification Bell (Header) ---
        const bell = document.getElementById('btn-notifications-mobile');
        if (bell) {
            bell.onclick = (e) => {
                e.preventDefault();
                const modal = document.getElementById('mobile-notif-modal');
                if (modal) modal.classList.remove('hidden');
                this.syncNotifUI();
            };
        }

        // --- Search Button ---
        const searchBtn = document.getElementById('btn-search');
        if (searchBtn) searchBtn.onclick = () => alert('جاري تفعيل محرك البحث العالمي... / Search Engine Coming Soon.');

        // --- TV Carousel Nav ---
        const tvPrev = document.getElementById('tv-prev');
        const tvNext = document.getElementById('tv-next');
        const carousel = document.getElementById('tv-carousel');
        if (tvPrev && carousel) tvPrev.onclick = () => carousel.scrollBy({ left: -220, behavior: 'smooth' });
        if (tvNext && carousel) tvNext.onclick = () => carousel.scrollBy({ left: 220, behavior: 'smooth' });

        // --- PiP Scrolling Observer (Premium) ---
        const contentArea = document.querySelector('.content-area');
        contentArea.addEventListener('scroll', () => {
            if (this.activeTV) {
                const playerWrapper = document.getElementById('tv-player-wrapper');
                if (!playerWrapper) return;
                
                const rect = playerWrapper.getBoundingClientRect();
                // If player is scrolled out of window, show PiP
                if (rect.bottom < 50 || rect.top > window.innerHeight) {
                    this.showPiP();
                } else {
                    this.hidePiP();
                }
            }
        }, { passive: true });
    },

    updateBellGlow: function() {
        const bell = document.getElementById('btn-notifications-mobile');
        if (!bell) return;
        if (this.audioEnabled) {
            bell.classList.add('audio-active');
        } else {
            bell.classList.remove('audio-active');
        }
    },

    setMapMode: function(mode) {
        if (!window.RasMirqabGlobe) return;
        document.getElementById('btn-3d').classList.toggle('active', mode === '3d');
        document.getElementById('btn-2d').classList.toggle('active', mode === '2d');
        
        const globeContainer = document.getElementById('globe-container');
        const mapContainer = document.getElementById('map-container');

        if (mode === '2d') {
            if (globeContainer) globeContainer.classList.add('hidden');
            if (mapContainer) mapContainer.classList.remove('hidden');
        } else {
            if (globeContainer) globeContainer.classList.remove('hidden');
            if (mapContainer) mapContainer.classList.add('hidden');
        }
        
        // Ensure controls stay visible (escape previous potential auto-hides)
        const controls = document.querySelector('.globe-controls');
        if (controls) controls.classList.remove('hidden');

        if (window.RasMirqabGlobe.toggleView) {
            RasMirqabGlobe.toggleView(mode);
        }
    },

    initBreakingNews: function() {
        if (window.BreakingNewsWidget) {
            // Override renderer for mobile design system
            BreakingNewsWidget.renderItems = this.renderMobileNewsItems.bind(this);
            BreakingNewsWidget.init();
            // FORCE CACHE SYNC
            if (BreakingNewsWidget.fetchServerCache) BreakingNewsWidget.fetchServerCache();
        }
    },

    renderMobileNewsItems: function(container, items) {
        if (!container) return;
        container.innerHTML = '';
        
        // Match 4-row fixed layout from parity image
        container.style.maxHeight = '380px';
        container.style.overflowY = 'auto';
        
        const displayItems = items.slice(0, 20);

        const AVATARS = {
            'aljazeera': '../public/logos/ajanews_new.png',
            'alarabiya': '../public/logos/alarabiya.png',
            'sky': '../public/logos/sky.png',
            'bbc': '../public/logos/bbc.png',
            'reuters': '../public/logos/reuters.png'
        };

        displayItems.forEach(item => {
            const handle = (item.source || '').toLowerCase();
            const avatar = AVATARS[handle] || '../public/logos/default.png';
            const thumb = item.image || item.mediaUrl || avatar;
            const time = item.time || new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

            const html = `
                <div class="news-item" onclick="window.open('${item.link}', '_blank')">
                    <div class="ni-left-stack">
                        <span class="ni-time">${time}</span>
                        <img src="${avatar}" class="ni-source-logo" alt="source">
                    </div>
                    <div class="ni-content">
                        <div class="ni-text">${item.title}</div>
                    </div>
                    <div class="ni-thumbnail">
                        <img src="${thumb}" class="ni-thumb-img" alt="thumb" onerror="this.style.display='none'">
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    },

    initLayersModal: function() {
        const list = document.getElementById('layers-list');
        if (!list) return;

        // More robust data recovery
        const dataHelper = window.RasMirqabData;
        if (!dataHelper || !dataHelper.categories) {
            console.error('--- Layers Data Fatal: Missing RasMirqabData.categories ---');
            list.innerHTML = '<div style="color:#666; font-size:11px; padding:20px;">جاري تحميل البيانات...</div>';
            return;
        }

        let html = '';
        Object.keys(dataHelper.categories).forEach(key => {
            const cat = dataHelper.categories[key];
            const isChecked = localStorage.getItem('layer-' + key) !== 'false';
            
            html += `
                <div class="layer-item">
                    <span class="layer-label">${cat.emoji} ${cat.labelAr || cat.label}</span>
                    <label class="switch tiny">
                        <input type="checkbox" id="layer-${key}" ${isChecked ? 'checked' : ''} onchange="MobileApp.toggleLayer('${key}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        });
        list.innerHTML = html;
    },

    toggleLayer: function(key, active) {
        localStorage.setItem('layer-' + key, active);
        if (window.RasMirqabGlobe) {
            if (RasMirqabGlobe.updateGlobeMarkers) RasMirqabGlobe.updateGlobeMarkers();
            if (RasMirqabGlobe.updateMapMarkers) RasMirqabGlobe.updateMapMarkers();
        }
        // Force refresh if the shared script uses global listeners
        const event = new CustomEvent('layerChange', { detail: { key, active } });
        window.dispatchEvent(event);
    },

    initTVCarousel: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        // Force desktop parity by using the LiveTVWidget channel pool
        const tvFeeds = (window.LiveTVWidget && LiveTVWidget.getChannels) ? LiveTVWidget.getChannels() : [];
        
        if (tvFeeds.length === 0) {
            carousel.innerHTML = '<div style="color:#666; font-size:11px; padding:20px; text-align:center;">جاري تحميل القنوات...</div>';
            return;
        }

        let html = '';
        tvFeeds.forEach(ch => {
            html += `
                <div class="tv-card" id="card-${ch.key}" onclick="MobileApp.playTV('${ch.key}', this)">
                    <img src="https://img.youtube.com/vi/${ch.videoId}/mqdefault.jpg" class="tv-thumb" alt="${ch.name}">
                    <div class="tv-live-badge">LIVE</div>
                    <div class="tv-card-name">${ch.name}</div>
                </div>
            `;
        });
        carousel.innerHTML = html;
        
        // Al Jazeera first selection + Orange Glow
        const first = tvFeeds.find(c => c.key === 'aljazeera') || tvFeeds[0];
        if (first) {
            const el = document.getElementById(`card-${first.key}`);
            if (el) {
                 // Fast interaction hint: auto-play Al Jazeera on load
                 setTimeout(() => this.playTV(first.key, el), 1000);
            }
        }
    },

    playTV: function(key, el) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        
        const tvFeeds = (window.LiveTVWidget && LiveTVWidget.getChannels) ? LiveTVWidget.getChannels() : window.FeedsData?.tv || [];
        const channel = tvFeeds.find(c => c.key === key);
        if (!channel) return;

        this.activeTV = channel;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        // RENDER TO MAIN WRAPPER FIRST
        const playerWrapper = document.getElementById('tv-player-wrapper');
        const pipFrame = document.getElementById('pip-video-frame');
        
        const iframeHtml = `
            <iframe src="https://www.youtube.com/embed/${channel.videoId}?autoplay=1&mute=0&modestbranding=1" 
                    allow="autoplay; encrypted-media" allowfullscreen 
                    style="width:100%; height:100%; border:none;"></iframe>
        `;

        if (playerWrapper) {
            playerWrapper.innerHTML = iframeHtml;
            this.hidePiP(); // Reset PiP when new video selected
        }
        if (pipFrame) pipFrame.innerHTML = iframeHtml;
    },

    showPiP: function() {
        if (!this.activeTV || this.isPiPActive) return;
        const pip = document.getElementById('mobile-pip-container');
        if (pip) {
            pip.classList.remove('hidden');
            this.isPiPActive = true;
        }
    },

    hidePiP: function() {
        const pip = document.getElementById('mobile-pip-container');
        if (pip) pip.classList.add('hidden');
        this.isPiPActive = false;
    },

    closePiP: function() {
        this.activeTV = null;
        this.hidePiP();
        const frame = document.getElementById('pip-video-frame');
        if (frame) frame.innerHTML = '';
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('active'));
    },

    initWidgetsGrid: function() {
        const grid = document.getElementById('mobile-widgets-grid');
        if (!grid) return;

        // Desktop parity widgets
        const widgets = [
            { label: 'توقيت العالم', icon: '🌍', id: 'world-clock', val: '--:--' },
            { label: 'الذهب والعملات', icon: '💰', id: 'gold-silver', val: '5,171.500' },
            { label: 'تتبع التحركات', icon: '📡', id: 'military-aircraft', val: 'LIVE MAP' },
            { label: 'كاميرا مباشرة', icon: '📸', id: 'live-webcams', val: 'ACTIVE' },
            { label: 'الاستخبارات السيبرانية', icon: '🛡️', id: 'cyber-intel', val: 'MONITORING' },
            { label: 'أسواق الأصول', icon: '📊', id: 'market-overview', val: '+1.77% ▲' }
        ];

        grid.innerHTML = widgets.map(w => `
            <div class="widget-card" id="mw-${w.id}">
                <span class="w-icon">${w.icon}</span>
                <span class="w-label">${w.label}</span>
                <div class="w-main" id="mwc-${w.id}">${w.val}</div>
                <div class="w-chart" id="mwc-chart-${w.id}"></div>
                <span class="badge-t7">T7</span>
            </div>
        `).join('');

        // Link with desktop widget logic if available
        this.linkWidgetData();
    },

    linkWidgetData: function() {
        // World Clock update (Real Logic)
        setInterval(() => {
            const clock = document.getElementById('mwc-world-clock');
            if (clock) {
                const now = new Date();
                const riyadh = now.toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                clock.innerHTML = `<span style="font-size:10px; opacity:0.6;">Riyadh</span><br>${riyadh}`;
            }
        }, 1000);

        // Gold & Silver (Link to Desktop if script loaded)
        if (window.GoldSilverWidget) {
             setInterval(() => {
                 const gs = document.getElementById('mwc-gold-silver');
                 if (gs) gs.innerText = GoldSilverWidget.getLatestValue ? GoldSilverWidget.getLatestValue() : '5,171.500';
             }, 5000);
        }

        // Cyber Intel (Animation)
        const cyber = document.getElementById('mwc-cyber-intel');
        if (cyber) {
            setInterval(() => {
                const status = ['MONITORING', 'ACTIVE SCAN', 'THREAT LEVEL: LOW', 'STABLE'];
                cyber.innerText = status[Math.floor(Math.random() * status.length)];
            }, 3000);
        }

        // Markets Glow
        const market = document.getElementById('mwc-market-overview');
        if (market) market.classList.add('m-green');
    },

    syncNotifUI: function() {
        const vol = localStorage.getItem('rasmirqab_notif_volume') || 0.5;
        const visual = localStorage.getItem('rasmirqab_visual_notif') !== 'false';
        const audio = localStorage.getItem('rasmirqab_audio_notif') !== 'false';
        
        const slider = document.getElementById('notif-volume-slider-mobile');
        const valText = document.getElementById('notif-volume-value-mobile');
        const visualCheck = document.getElementById('toggle-visual-notif-mobile');
        const audioCheck = document.getElementById('toggle-audio-notif-mobile');

        if (slider) slider.value = vol;
        if (valText) valText.innerText = `${Math.round(vol * 100)}%`;
        if (visualCheck) visualCheck.checked = visual;
        if (audioCheck) audioCheck.checked = audio;
    },

    initNotificationModal: function() {
        const close = document.getElementById('close-notif-modal');
        const overlay = document.querySelector('#mobile-notif-modal .modal-overlay');
        const modal = document.getElementById('mobile-notif-modal');
        
        const closeFn = () => modal.classList.add('hidden');
        if (close) close.onclick = closeFn;
        if (overlay) overlay.onclick = closeFn;

        const slider = document.getElementById('notif-volume-slider-mobile');
        if (slider) {
            slider.oninput = () => {
                const v = slider.value;
                document.getElementById('notif-volume-value-mobile').innerText = `${Math.round(v * 100)}%`;
                localStorage.setItem('rasmirqab_notif_volume', v);
                const audio = document.getElementById('breaking-news-audio');
                if (audio) audio.volume = v;
                if (window.RasMirqabNotification) window.RasMirqabNotification.volume = v;
            };
        }

        const tv = document.getElementById('toggle-visual-notif-mobile');
        const ta = document.getElementById('toggle-audio-notif-mobile');
        if (tv) {
            tv.onchange = () => {
                localStorage.setItem('rasmirqab_visual_notif', tv.checked);
                if (window.RasMirqabNotification) window.RasMirqabNotification.visualEnabled = tv.checked;
            };
        }
        if (ta) {
            ta.onchange = () => {
                this.audioEnabled = ta.checked;
                localStorage.setItem('rasmirqab_audio_notif', ta.checked);
                if (window.RasMirqabNotification) window.RasMirqabNotification.audioEnabled = ta.checked;
                this.updateBellGlow();
            };
        }
    },

    scrollToSection: function(sec) {
        const content = document.querySelector('.content-area');
        if (sec === 'home') {
            content.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.classList.remove('map-hidden');
            const btn = document.getElementById('btn-hide-map');
            if (btn) btn.querySelector('span').innerText = 'Hide Map';
        } else if (sec === 'news') {
            const news = document.getElementById('news-list');
            if (news) news.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (sec === 'tv') {
            const tv = document.querySelector('.tv-carousel-container');
            if (tv) tv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (sec === 'markets') {
            const grid = document.getElementById('mobile-widgets-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (sec === 'settings') {
            const bell = document.getElementById('btn-notifications-mobile');
            if (bell) bell.click(); // Toggle sound or show modal? User wanted bell for sound, so maybe modal here.
        }
    },

    initAudioUnlock: function() {
        const unlock = () => {
            const audio = document.getElementById('breaking-news-audio');
            if (audio) {
                audio.muted = false;
                audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
            }
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('touchstart', unlock);
        document.addEventListener('click', unlock);
    },
    initDraggablePiP: function() {
        const pip = document.getElementById('mobile-pip-container');
        if (!pip) return;

        let isDragging = false;
        let startX, startY;
        let initialX, initialY;

        pip.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = pip.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            pip.style.transition = 'none';
        });

        pip.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            let nx = initialX + dx;
            let ny = initialY + dy;

            // Simple Screen Bounds
            nx = Math.max(0, Math.min(nx, window.innerWidth - 180));
            ny = Math.max(0, Math.min(ny, window.innerHeight - 110));

            pip.style.left = nx + 'px';
            pip.style.top = ny + 'px';
            pip.style.right = 'auto';
            pip.style.bottom = 'auto';
        });

        pip.addEventListener('touchend', () => {
             isDragging = false;
             pip.style.transition = 'all 0.3s ease';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => MobileApp.init());
