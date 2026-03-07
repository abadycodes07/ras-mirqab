/* ═══════════════════════════════════════════════
   MAIN ORCHESTRATOR — RAS MIRQAB
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── SPLASH SCREEN ─── */
    function runSplash(callback) {
        var splash = document.getElementById('splash-screen');
        var app = document.getElementById('app');

        if (!splash) {
            if (callback) callback();
            return;
        }

        // Start radar audio right away
        playRadarSound();
        
        // Start booting in the background immediately!
        if (callback) callback();

        // Wait for the loader animation to finish (3 seconds)
        setTimeout(function () {
            splash.classList.add('fade-out');

            setTimeout(function () {
                splash.style.display = 'none';
                if (app) {
                    app.classList.remove('app-hidden');
                    app.classList.add('app-visible');
                }
            }, 800);
        }, 3000);
    }


    /* ─── AUDIO ─── */
    function playRadarSound() {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            var ctx = new AudioContext();
            var startTime = ctx.currentTime;

            // 4 radar pulses over 4 seconds
            for (var i = 0; i < 4; i++) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';

                // Sweep down
                osc.frequency.setValueAtTime(800 + (i * 50), startTime + i);
                osc.frequency.exponentialRampToValueAtTime(100, startTime + i + 0.5);

                // Volume envelope
                gain.gain.setValueAtTime(0, startTime + i);
                gain.gain.linearRampToValueAtTime(0.15, startTime + i + 0.1);
                gain.gain.linearRampToValueAtTime(0, startTime + i + 0.8);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime + i);
                osc.stop(startTime + i + 1);
            }
        } catch (e) {
            console.warn("Audio sweep failed", e);
        }
    }

    /* ─── HEADER CLOCK ─── */
    function updateHeaderClock() {
        var el = document.getElementById('header-clock');
        if (!el) return;
        var now = new Date();
        var riyadh = now.toLocaleString('en-US', {
            timeZone: 'Asia/Riyadh',
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        var utc = now.toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        el.textContent = riyadh + '  •  ' + utc + ' UTC';
    }

    /* ─── CAMERA MODAL ─── */
    function initCameraModal() {
        var btn = document.getElementById('btn-cameras');
        var modal = document.getElementById('camera-modal');
        var closeBtn = document.getElementById('close-camera-modal');
        var overlay = modal ? modal.querySelector('.modal-overlay') : null;
        var grid = document.getElementById('camera-grid');

        if (!btn || !modal) return;

        var cameras = [
            { label: 'طهران — إيران', videoId: '-zGuR1qVKrU' },
            { label: 'تل أبيب — إسرائيل', videoId: 'gmtlJ_m2r5A' },
            { label: 'القدس — فلسطين', videoId: 'fIurYTprwzg' },
            { label: 'الشرق الأوسط — مباشر', videoId: '4E-iFtUM2kk' },
        ];

        btn.addEventListener('click', function () {
            modal.classList.remove('hidden');
            if (grid && !grid.dataset.loaded) {
                var html = '';
                cameras.forEach(function (cam) {
                    html +=
                        '<div class="camera-cell">' +
                        '  <div class="camera-label">' + cam.label + '</div>' +
                        '  <iframe src="https://www.youtube.com/embed/' + cam.videoId + '?autoplay=1&mute=1&rel=0" ' +
                        '    allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>' +
                        '</div>';
                });
                grid.innerHTML = html;
                grid.dataset.loaded = 'true';
            }
        });

        function closeModal() {
            modal.classList.add('hidden');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);
    }

    /* ─── SETTINGS MODAL ─── */
    function initSettingsModal() {
        var btn = document.getElementById('btn-settings');
        var modal = document.getElementById('settings-modal');
        var closeBtn = document.getElementById('close-settings-modal');
        var overlay = modal ? modal.querySelector('.modal-overlay') : null;
        var body = document.getElementById('settings-body');

        if (!btn || !modal) return;

        btn.addEventListener('click', function () {
            modal.classList.remove('hidden');
            if (body && !body.dataset.loaded) {
                body.innerHTML =
                    '<div class="setting-group">' +
                    '  <label>قناة البث المباشر الافتراضية</label>' +
                    '  <select id="setting-default-channel">' +
                    '    <option value="aljazeera">الجزيرة</option>' +
                    '    <option value="alarabiya">العربية</option>' +
                    '    <option value="skynews">سكاي نيوز عربية</option>' +
                    '    <option value="france24">فرانس 24 عربية</option>' +
                    '    <option value="bbc">BBC عربي</option>' +
                    '  </select>' +
                    '</div>' +
                    '<div class="setting-group">' +
                    '  <label>وضع الخريطة</label>' +
                    '  <select id="setting-map-mode">' +
                    '    <option value="3d">كرة أرضية ثلاثية الأبعاد (3D)</option>' +
                    '    <option value="2d">خريطة مسطحة (2D)</option>' +
                    '  </select>' +
                    '</div>' +
                    '<div class="setting-group">' +
                    '  <label>السمة</label>' +
                    '  <select id="setting-theme">' +
                    '    <option value="dark">داكن (افتراضي)</option>' +
                    '    <option value="midnight">منتصف الليل</option>' +
                    '    <option value="tactical">تكتيكي</option>' +
                    '  </select>' +
                    '</div>' +

                    '<div class="setting-group">' +
                    '  <label>تحديث البيانات (ثانية)</label>' +
                    '  <select id="setting-refresh">' +
                    '    <option value="30">30 ثانية</option>' +
                    '    <option value="60" selected>60 ثانية</option>' +
                    '    <option value="120">120 ثانية</option>' +
                    '    <option value="300">5 دقائق</option>' +
                    '  </select>' +
                    '</div>' +
                    '<div class="setting-group" style="margin-top:20px;">' +
                    '  <button onclick="RasMirqabGrid.resetLayout()" style="' +
                    '    padding:8px 20px;background:var(--accent);color:var(--bg-primary);' +
                    '    border:none;border-radius:6px;font-family:var(--font-ar);font-weight:600;' +
                    '    cursor:pointer;font-size:0.85rem;">إعادة تعيين التخطيط</button>' +
                    '</div>';
                body.dataset.loaded = 'true';

                // Map mode toggle
                var mapSelect = document.getElementById('setting-map-mode');
                if (mapSelect) {
                    mapSelect.addEventListener('change', function () {
                        var cur = document.getElementById('globe-container').classList.contains('hidden') ? '2d' : '3d';
                        if ((this.value === '2d' && cur === '3d') || (this.value === '3d' && cur === '2d')) {
                            RasMirqabGlobe.toggle();
                        }
                    });
                }


            }
        });

        function closeModal() {
            modal.classList.add('hidden');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);
    }

    /* ─── MAP TOGGLE BUTTON ─── */
    function initMapToggle() {
        var btn = document.getElementById('btn-toggle-map');
        if (!btn) return;
        btn.addEventListener('click', function () {
            RasMirqabGlobe.toggle();
        });
    }

    /* ─── NOTIFICATIONS ─── */
    /* ─── NOTIFICATIONS ─── */
    window.RasMirqabNotification = {
        toastContainer: null,
        visualEnabled: localStorage.getItem('rasmirqab_visual_notif') !== 'false',
        audioEnabled: localStorage.getItem('rasmirqab_audio_notif') !== 'false', // Default ON

        show: function (title, msg) {
            if (!this.visualEnabled) return; // Silent return if blocked by user

            if (!this.toastContainer) {
                this.toastContainer = document.getElementById('toast-container');
            }

            // Play audio if enabled
            if (this.audioEnabled) {
                var audio = document.getElementById('breaking-news-audio');
                if (audio) {
                    console.log('Attempting to play notification audio...');
                    audio.muted = false;
                    audio.volume = 1.0;
                    audio.currentTime = 0;

                    var playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(function () {
                            console.log('Audio played successfully!');
                        }).catch(function (error) {
                            console.error('Audio play FAILED even after interaction:', error);
                            // Fallback: Try creating a fresh Audio object
                            console.log('Attempting fallback with new Audio()...');
                            var fallbackAudio = new Audio('public/breaking-news-tone.mp3');
                            fallbackAudio.volume = 1.0;
                            fallbackAudio.play().catch(function (e2) {
                                console.error('Fallback Audio also FAILED:', e2);
                            });
                        });
                    }
                } else {
                    console.error('Audio element #breaking-news-audio NOT FOUND');
                }
            }

            var toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.innerHTML =
                '<div class="toast-header">' +
                '  <span>🚨 عاجل: ' + title + '</span>' +
                '</div>' +
                '<div class="toast-body">' + msg + '</div>';

            this.toastContainer.appendChild(toast);

            // Trigger animation
            setTimeout(function () { toast.classList.add('show'); }, 50);

            // Remove after 6 seconds
            setTimeout(function () {
                toast.classList.remove('show');
                setTimeout(function () { toast.remove(); }, 400);
            }, 6000);
        }
    };

    /* ─── NOTIFICATION BELL & DROPDOWN ─── */
    function initNotifications() {
        var btn = document.getElementById('btn-notifications');
        var dropdown = document.getElementById('notifications-dropdown');
        var badge = document.getElementById('notification-badge');

        var toggleVis = document.getElementById('toggle-visual-notif');
        var toggleAud = document.getElementById('toggle-audio-notif');

        if (!btn || !dropdown) return;

        // Init states from localStorage
        var visState = localStorage.getItem('rasmirqab_visual_notif') !== 'false';
        var audState = localStorage.getItem('rasmirqab_audio_notif') !== 'false'; // Default ON

        if (toggleVis) toggleVis.checked = visState;
        if (toggleAud) toggleAud.checked = audState;

        if (visState && badge) badge.classList.add('active'); // Start pulsing if armed

        // Helper to update Bell Glow for Audio
        function updateBellGlow() {
            if (window.RasMirqabNotification.audioEnabled) {
                btn.classList.add('audio-active');
            } else {
                btn.classList.remove('audio-active');
            }
        }
        updateBellGlow();

        // Hover events for the dropdown
        var dropdownContainer = btn.parentElement;
        dropdownContainer.addEventListener('mouseenter', function () {
            dropdown.classList.remove('hidden');
        });
        dropdownContainer.addEventListener('mouseleave', function () {
            dropdown.classList.add('hidden');
        });

        // Click on bell to mute/unmute audio directly
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var newAudioState = !window.RasMirqabNotification.audioEnabled;
            window.RasMirqabNotification.audioEnabled = newAudioState;
            localStorage.setItem('rasmirqab_audio_notif', newAudioState);
            if (toggleAud) toggleAud.checked = newAudioState;
            updateBellGlow();
        });

        // Listeners for switches inside the dropdown
        if (toggleVis) {
            toggleVis.addEventListener('change', function (e) {
                window.RasMirqabNotification.visualEnabled = e.target.checked;
                localStorage.setItem('rasmirqab_visual_notif', e.target.checked);
                if (badge) {
                    if (e.target.checked) badge.classList.add('active');
                    else badge.classList.remove('active');
                }
            });
        }

        if (toggleAud) {
            toggleAud.addEventListener('change', function (e) {
                window.RasMirqabNotification.audioEnabled = e.target.checked;
                localStorage.setItem('rasmirqab_audio_notif', e.target.checked);
                updateBellGlow();
            });
        }
    }

    /* ─── BOOT ─── */
    function boot() {
        console.log('Starting Ras Marqab boot process...');

        // Initialize globe
        RasMirqabGlobe.init();

        // Initialize grid with all widgets
        RasMirqabGrid.init();

        // Start clocks
        updateHeaderClock();
        setInterval(updateHeaderClock, 1000);

        RasMirqabGlobe.updateTime();
        setInterval(function () { RasMirqabGlobe.updateTime(); }, 1000);

        // Initialize modals and UI hooks
        initCameraModal();
        initSettingsModal();
        initMapToggle();
        initNotifications();

        console.log('Ras Marqab boot completed!');

        // 🔓 BROWSER AUTOPLAY UNLOCK (Workaround for Chrome/Edge)
        window.RasMirqabAudioUnlocked = false;
        window.RasMirqabWelcomeSent = false;

        var sendWelcome = function () {
            if (window.RasMirqabWelcomeSent) return;
            if (window.RasMirqabNotification && window.RasMirqabNotification.visualEnabled) {
                window.RasMirqabNotification.show('نظام الرصد متصل', 'تم ربط لوحة القيادة بمصادر الأخبار العاجلة بنجاح.');
                window.RasMirqabWelcomeSent = true;
            }
        };

        var unlockAudio = function () {
            if (window.RasMirqabAudioUnlocked) return;
            console.log('--- USER INTERACTION DETECTED ---');

            window.RasMirqabAudioUnlocked = true;

            // 1. Force unlock the breaking news audio
            var notifAudio = document.getElementById('breaking-news-audio');
            if (notifAudio) {
                notifAudio.muted = false;
                notifAudio.volume = 1.0;

                // Play and immediately pause/reset to "prime" the element
                notifAudio.play().then(function () {
                    console.log('Breaking News Audio is now UNLOCKED and ready.');
                    notifAudio.pause();
                    notifAudio.currentTime = 0;

                    // Now that audio is unlocked, send welcome if needed
                    sendWelcome();
                }).catch(function (e) {
                    console.warn('Initial audio prime failed, but might still work later:', e);
                    // Still try to send the welcome (visual at least)
                    sendWelcome();
                });
            } else {
                sendWelcome();
            }

            // 2. Reload Al Jazeera and other streams with sound enabled (mute=0)
            if (window.LiveTVWidget && typeof window.LiveTVWidget.reloadWithAudio === 'function') {
                console.log('Reloading TV widget with audio...');
                window.LiveTVWidget.reloadWithAudio();
            }

            // Clean up listeners
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('mousedown', unlockAudio);
        };

        // Add multiple triggers for unlocking
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('mousedown', unlockAudio);

        // Trigger welcome notification after a short delay (IF user already interacted)
        setTimeout(function () {
            if (window.RasMirqabAudioUnlocked) {
                sendWelcome();
            }
        }, 3500);
    }

    /* ─── ENTRY POINT ─── */
    document.addEventListener('DOMContentLoaded', function () {
        runSplash(boot);
    });
})();
