/* ═══════════════════════════════════════════════
   RAS MIRQAB - MOBILE CORE LOGIC (V19: 2026 EDITION)
   ═══════════════════════════════════════════════ */

const MobileApp = {
    activeTV: null,
    isPiPActive: false,
    audioEnabled: localStorage.getItem('rasmirqab_audio_notif') !== 'false',

    init: function() {
        console.log('--- MOBILE APP V19: GLASSMORPHISM UNLOCKED ---');
        
        // 1. Core Systems
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
            this.initLayersModal();
        }
        this.initBreakingNews();
        this.initTVCarousel();
        this.initWidgetsGrid();
        
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
                const isHidden = document.body.classList.toggle('map-hidden');
                btnHideMap.querySelector('span').innerText = isHidden ? 'Show Map' : 'Hide Map';
                btnHideMap.querySelector('svg').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                
                if (!isHidden && window.RasMirqabGlobe && RasMirqabGlobe.onWindowResize) {
                    setTimeout(() => RasMirqabGlobe.onWindowResize(), 150);
                }
            };
        }

        // --- Layers Modal ---
        const btnLayers = document.getElementById('btn-layers');
        const layersModal = document.getElementById('layers-modal');
        const closeLayers = document.getElementById('close-layers');
        if (btnLayers) btnLayers.onclick = () => layersModal.classList.remove('hidden');
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

        // --- PiP Scrolling Observer ---
        const contentArea = document.querySelector('.content-area');
        contentArea.addEventListener('scroll', () => {
            if (this.activeTV) {
                const tvSection = document.querySelector('.tv-carousel-container');
                const tvTop = tvSection ? tvSection.offsetTop : 400;
                
                // Trigger PiP when the TV section is scrolled out of view
                if (contentArea.scrollTop > tvTop + 150) {
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
        
        if (mode === '3d' && window.RasMirqabGlobe.show3D) RasMirqabGlobe.show3D();
        if (mode === '2d' && window.RasMirqabGlobe.show2D) RasMirqabGlobe.show2D();
    },

    initBreakingNews: function() {
        if (window.BreakingNewsWidget) {
            // Override renderer for mobile design system
            BreakingNewsWidget.renderItems = this.renderMobileNewsItems.bind(this);
            
            const container = document.getElementById('news-list');
            if (container) {
                BreakingNewsWidget.init();
            }
        }
    },

    renderMobileNewsItems: function(container, items) {
        if (!container) return;
        
        // Focus 2026: Mobile specific cleaner renderer
        container.innerHTML = '';
        
        // Limit to 4 items for "static" feel as requested
        const displayItems = items.slice(0, 4);

        const AVATARS = {
            'alrougui': '../public/logos/alrougui.jpg',
            'alekhbariyaNews': '../public/logos/alekhbariyanews.jpg',
            'alekhbariyabrk': '../public/logos/alekhbariyabrk.jpg',
            'ajanews': '../public/logos/ajanews_new.png',
            'alhadath_brk': '../public/logos/hadath.png',
            'AlArabiya': '../public/logos/alarabiya.png'
        };

        displayItems.forEach(item => {
            const handle = item.sourceHandle || '';
            const avatar = AVATARS[handle] || '../public/logos/default.png';
            const media = item.image || item.mediaUrl || null;
            const time = new Date(item.pubDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

            const itemEl = document.createElement('div');
            itemEl.className = 'news-item';
            itemEl.onclick = () => window.open(item.link, '_blank');

            itemEl.innerHTML = `
                <div class="news-item-right">
                    <img src="${media || avatar}" class="ni-thumb" onerror="this.src='${avatar}'">
                </div>
                <div class="news-item-center">
                    <div class="ni-text">${item.title}</div>
                </div>
                <div class="news-item-left">
                    <div class="ni-time">${time}</div>
                    <img src="${avatar}" class="ni-avatar">
                </div>
            `;
            container.appendChild(itemEl);
        });
    },

    initLayersModal: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData || !RasMirqabData.categories) return;

        let html = '';
        Object.keys(RasMirqabData.categories).forEach(key => {
            const cat = RasMirqabData.categories[key];
            const isChecked = localStorage.getItem('layer-' + key) !== 'false';
            
            html += `
                <div class="layer-item">
                    <span class="layer-label">${cat.emoji} ${cat.labelAr}</span>
                    <label class="switch tiny">
                        <input type="checkbox" id="mlayer-${key}" ${isChecked ? 'checked' : ''} onchange="MobileApp.toggleLayer('${key}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        });
        list.innerHTML = html;
    },

    toggleLayer: function(key, active) {
        localStorage.setItem('layer-' + key, active);
        if (window.RasMirqabGlobe && RasMirqabGlobe.updateMarkers) {
             // If shared globe has a refresh method, call it
             // For now, assume it reactive via shared logic
        }
        // Force refresh if the shared script uses global listeners
        const event = new CustomEvent('layerChange', { detail: { key, active } });
        window.dispatchEvent(event);
    },

    initTVCarousel: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const tvFeeds = (window.FeedsData && window.FeedsData.tv) ? window.FeedsData.tv : [];
        if (tvFeeds.length === 0) {
            carousel.innerHTML = '<div style="color:#555; font-size:10px; padding:20px;">No feeds found.</div>';
            return;
        }

        let html = '';
        tvFeeds.forEach(ch => {
            html += `
                <div class="tv-card" id="card-${ch.id}" onclick="MobileApp.playTV('${ch.id}', this)">
                    <img src="${ch.thumb || '../public/placeholder.jpg'}" class="tv-thumb" alt="${ch.name}">
                    <div class="tv-live-badge">LIVE</div>
                    <div style="position:absolute; bottom:12px; left:12px; font-size:10px; font-weight:900; color:#fff; text-shadow:0 0 10px #000; z-index:5;">${ch.name}</div>
                </div>
            `;
        });
        carousel.innerHTML = html;
        
        // Highlight first channel but don't play yet
        const first = tvFeeds[0];
        if (first) {
            const el = document.getElementById(`card-${first.id}`);
            if (el) el.classList.add('active');
        }
    },

    playTV: function(id, el) {
        // Grow/Glow Effect
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        
        const channel = window.FeedsData.tv.find(c => c.id === id);
        if (!channel) return;

        this.activeTV = channel;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        // Update PiP Frame (Mainly used when PiP is active, but pre-loads here)
        const frame = document.getElementById('pip-video-frame');
        if (frame) {
            frame.innerHTML = `
                <iframe src="https://www.youtube.com/embed/${channel.videoId}?autoplay=1&mute=0&modestbranding=1" 
                        allow="autoplay; encrypted-media" allowfullscreen 
                        style="width:100%; height:100%; border:none;"></iframe>
            `;
        }
        
        console.log(`[MobileTV] Stream Selected: ${channel.name} (Audio ON)`);
        
        // If we're already scrolled down, show PiP immediately
        const contentArea = document.querySelector('.content-area');
        const tvSection = document.querySelector('.tv-carousel-container');
        if (contentArea && tvSection && contentArea.scrollTop > tvSection.offsetTop + 150) {
            this.showPiP();
        }
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
            <div class="widget" id="mw-${w.id}">
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
        // World Clock update
        setInterval(() => {
            const clock = document.getElementById('mwc-world-clock');
            if (clock) {
                const now = new Date();
                const ksa = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
                clock.innerHTML = `<span style="font-size:10px; opacity:0.6; margin-left:5px;">Riyadh</span> ${ksa}`;
            }
        }, 1000);

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
    }
};

document.addEventListener('DOMContentLoaded', () => MobileApp.init());

document.addEventListener('DOMContentLoaded', () => MobileApp.init());
