/* ═══════════════════════════════════════════════
   3D GLOBE + 2D MAP ENGINE
   ═══════════════════════════════════════════════ */

var RasMirqabGlobe = (function () {
    var globe = null;
    var map = null;
    var is3D = true;
    var activeLayers = {};
    var intenseWarZones = ['ISR', 'UKR', 'IRN', 'SDN'];
    var conflictCountries = ['LBN', 'YEM', 'SYR', 'IRQ'];
    var airspaceClosedCountries = ['UKR', 'ISR', 'IRN', 'LBN', 'YEM'];

    function init() {
        // dynamically initialize active layers from default states
        if (window.RasMirqabData && RasMirqabData.categories) {
            Object.keys(RasMirqabData.categories).forEach(function (k) {
                activeLayers[k] = RasMirqabData.categories[k].default;
            });
        }

        initGlobe3D();
        initDimensionToggle();
        initLayerToggles();
        initLegend();
    }

    /* ─── 3D GLOBE (globe.gl) ─── */
    function initGlobe3D() {
        var container = document.getElementById('globe-container');
        if (!container) {
            console.warn('Globe container not found');
            return;
        }

        if (typeof Globe === 'undefined') {
            console.warn('Globe.gl not available, using fallback');
            initFallbackGlobe();
            return;
        }

        try {
            // Create the 3D globe
            globe = Globe()(container)
                .backgroundColor('rgba(0,0,0,0)')
                .showGlobe(true)
                .globeImageUrl('src/assets/earth-dark.jpg')
                .bumpImageUrl('src/assets/earth-topology.png')
                .backgroundImageUrl('src/assets/night-sky.png')
                .showAtmosphere(true)
                .atmosphereColor('#ff6a00')
                .atmosphereAltitude(0.15)
                .width(container.clientWidth)
                .height(container.clientHeight);

            // --- Custom Cinematic Lighting & Flare ---
            setTimeout(function () {
                if (typeof THREE === 'undefined') {
                    console.error("THREE is not defined, cannot apply custom lighting.");
                    return;
                }

                var scene = globe.scene();
                var lights = [];

                // Gather default lights
                scene.children.forEach(function (c) {
                    if (c.type === 'PointLight' || c.type === 'AmbientLight' || c.type === 'DirectionalLight') {
                        lights.push(c);
                    }
                });
                // Safely remove them
                lights.forEach(function (l) { scene.remove(l); });

                // 1. Dim ambient light
                var ambient = new THREE.AmbientLight(0x444444, 0.4);
                scene.add(ambient);

                // 2. Faded subtle directional spotlight on focus area
                var directionalLight = new THREE.DirectionalLight(0xfff0dd, 1.5);
                directionalLight.position.set(2, 1, 2).normalize();
                scene.add(directionalLight);

                // 3. Back flare/glow
                var backLight = new THREE.DirectionalLight(0xff6a00, 2);
                backLight.position.set(-2, -1, -3).normalize();
                scene.add(backLight);
            }, 300);

            // Set initial view to Middle East
            globe.pointOfView({ lat: 25, lng: 45, altitude: 2.2 });

            // Enable auto-rotation
            var controls = globe.controls();
            if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.3;
                controls.enableDamping = true;
            }

            // Stop rotation on interact, resume after 60s
            var resumeTimer = null;
            container.addEventListener('mousedown', function () {
                if (controls) controls.autoRotate = false;
                clearTimeout(resumeTimer);
            });
            container.addEventListener('mouseup', function () {
                resumeTimer = setTimeout(function () {
                    if (controls) controls.autoRotate = true;
                }, 60000);
            });

            // Add animated arcs between conflict zones
            addConflictArcs();

            // Add all markers (ThreeJS Sprites)
            updateGlobeMarkers();

            // Add path layers (Pipelines, Cables)
            updateGlobePaths();

            // Fetch live OSINT Naval Intelligence (Battleships)
            fetch('http://localhost:3001/battleships')
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.items && data.items.length > 0 && window.RasMirqabData) {
                        var bsPoints = data.items.map(function (b) {
                            return { cat: 'navies', name: b.nameAr, lat: b.lat, lng: b.lon, desc: b.nameEn + ' - ' + b.desc, emoji: '🛳', color: '#0984e3', size: 22 };
                        });
                        window.RasMirqabData.points = window.RasMirqabData.points.concat(bsPoints);
                        updateGlobeMarkers(); // Apply to 3D Globe
                        if (!is3D) updateMapMarkers(); // Apply to 2D Map if active
                        console.log('Live battleships data loaded from proxy:', bsPoints.length);
                    }
                }).catch(function (err) { console.warn('Could not fetch live navies:', err); });

            // Resize handler
            window.addEventListener('resize', function () {
                if (globe && is3D) {
                    globe.width(container.clientWidth).height(container.clientHeight);
                }
            });

            console.log('3D Globe initialized successfully');
        } catch (error) {
            console.error('Error initializing 3D globe:', error);
            var errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:absolute;z-index:9999;color:#ff3333;background:rgba(0,0,0,0.8);padding:20px;top:20px;left:20px;border-radius:8px;font-family:monospace;max-width:500px;font-size:14px;';
            errDiv.innerHTML = '<strong>Globe Error:</strong><br>' + (error.stack || error.message).replace(/\n/g, '<br>');
            document.body.appendChild(errDiv);
            initFallbackGlobe();
        }
    }
    function addConflictArcs() {
        var arcsData = [
            // 🟦 Blue Projectiles
            { type: 'rocket', startLat: 31.7683, startLng: 35.2137, endLat: 35.6892, endLng: 51.3890, color: 'rgba(0, 100, 255, 0.15)' }, // Israel to Iran
            { type: 'rocket', startLat: 20.0, startLng: 62.0, endLat: 33.0, endLng: 53.0, color: 'rgba(0, 100, 255, 0.15)' }, // US Carrier to Iran
            
            // 🟥 Red Projectiles (From Iran)
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 29.3759, endLng: 47.9774, color: 'rgba(255, 0, 0, 0.15)' }, // Kuwait
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 26.0667, endLng: 50.5577, color: 'rgba(255, 0, 0, 0.15)' }, // Bahrain
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 25.2854, endLng: 51.5310, color: 'rgba(255, 0, 0, 0.15)' }, // Qatar
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 24.4539, endLng: 54.3773, color: 'rgba(255, 0, 0, 0.15)' }, // UAE
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 23.5859, endLng: 58.4059, color: 'rgba(255, 0, 0, 0.15)' }, // Oman
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 24.7136, endLng: 46.6753, color: 'rgba(255, 0, 0, 0.15)' }, // Saudi
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 33.3128, endLng: 44.3615, color: 'rgba(255, 0, 0, 0.15)' }, // Iraq
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 39.9334, endLng: 32.8597, color: 'rgba(255, 0, 0, 0.15)' }, // Turkey
            { type: 'rocket', startLat: 35.6892, startLng: 51.3890, endLat: 40.4093, endLng: 49.8671, color: 'rgba(255, 0, 0, 0.15)' }, // Azerbaijan
        ];

        // 🚢 Straits / Blockades (Surface Level) dynamically from intelligence.js
        if (window.RasMirqabIntel && window.RasMirqabIntel.STRAITS) {
            window.RasMirqabIntel.STRAITS.forEach(function (strait) {
                // Determine if it's Hormuz
                var isHormuz = strait.nameEn.toLowerCase().includes('hormuz') || strait.nameAr.includes('هرمز');
                // Traffic light style offsets to give arc direction length
                var endLatOffset = strait.lat - 1.5;
                var endLngOffset = strait.lon + 1.5;

                arcsData.push({
                    type: 'strait',
                    startLat: strait.lat,
                    startLng: strait.lon,
                    endLat: endLatOffset,
                    endLng: endLngOffset,
                    color: isHormuz ? ['#ff0000', '#000000'] : ['#2ecc71', '#00ff88'] // Red/Black for Hormuz, Green for others
                });
            });
        }

        globe.arcsData(arcsData)
            .arcColor('color')
            .arcDashLength(function (d) { return d.type === 'rocket' ? 0.7 : 0.15; })
            .arcDashGap(function (d) { return d.type === 'rocket' ? 0.3 : 0.1; })
            .arcDashInitialGap(function () { return Math.random(); })
            .arcDashAnimateTime(function (d) { return d.type === 'rocket' ? 1200 : 2500; })
            .arcAltitude(function (d) { return d.type === 'rocket' ? 0.4 : 0.001; }) // Rockets fly high
            .arcStroke(function (d) { return d.type === 'rocket' ? 0.6 : 2.0; }); // Thinner rockets and high transparency

    }

    function generateEmojiTexture(emoji, color, name) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background circle
        ctx.beginPath();
        ctx.arc(64, 48, 24, 0, 2 * Math.PI); // Smaller circle
        const rgbMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 16);
            const g = parseInt(rgbMatch[2], 16);
            const b = parseInt(rgbMatch[3], 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        } else {
            ctx.fillStyle = color;
        }
        ctx.fill();
        ctx.lineWidth = 2; // Thinner border
        ctx.strokeStyle = color;
        ctx.stroke();

        // Emoji
        ctx.font = '24px sans-serif'; // Smaller emoji
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(emoji, 64, 52); // Adjust y for alignment

        // Name Text
        ctx.font = 'bold 12px sans-serif'; // Reduced from 16px
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillText(name, 64, 94); // Moved up slightly to compensate for smaller font

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    function updateGlobeMarkers() {
        if (!globe || typeof THREE === 'undefined') return;

        if (!window.RasMirqabData || !RasMirqabData.points) return;

        // Filter markers based on active layers
        var activeMarkers = RasMirqabData.points.filter(function (marker) {
            var checkbox = document.getElementById('layer-' + marker.cat);
            return checkbox ? checkbox.checked : (activeLayers[marker.cat] !== false);
        });

        // Add fading 3D Fighter Jets around hotspots
        var jets = [
            { isJet: true, lat: 31.9, lng: 34.5, angle: 45, name: 'F-35I (إسرائيل)' },  // Israel
            { isJet: true, lat: 25.5, lng: 51.3, angle: -30, name: 'F-15E (العديد)' }, // US Base Qatar
            { isJet: true, lat: 34.0, lng: 50.0, angle: 90, name: 'F-14 (إيران)' },   // Iran
            { isJet: true, lat: 33.2, lng: 35.8, angle: 180, name: 'دورية جوية' }    // Lebanon/Syria border
        ];
        activeMarkers = activeMarkers.concat(jets);

        // Use custom ThreeJS objects for true attachment to the 3D sphere
        globe.customLayerData(activeMarkers)
            .customThreeObject(function (d) {
                if (d.isJet) {
                    // Create faded transparent fighter jet sprite
                    var canvas = document.createElement('canvas');
                    canvas.width = 64; canvas.height = 64;
                    var ctx = canvas.getContext('2d');
                    ctx.font = '28px sans-serif';
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)'; // Faded transparent
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                    // Rotate for heading direction
                    ctx.translate(32, 32);
                    ctx.rotate(d.angle * Math.PI / 180);
                    ctx.fillText('✈️', 0, 0);

                    var tex = new THREE.CanvasTexture(canvas);
                    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6 });
                    var spr = new THREE.Sprite(mat);
                    spr.scale.set(1.5, 1.5, 1);
                    // Jets fly exactly at altitude 0.05
                    spr.position.x = globe.getCoords(d.lat, d.lng, 0.05).x;
                    spr.position.y = globe.getCoords(d.lat, d.lng, 0.05).y;
                    spr.position.z = globe.getCoords(d.lat, d.lng, 0.05).z;
                    spr.__data = d;
                    return spr;
                }

                var catInfo = RasMirqabData.categories[d.cat] || { emoji: '📍', color: '#fff' };
                var emoji = d.emoji || catInfo.emoji;
                var color = d.color || catInfo.color;

                var texture = generateEmojiTexture(emoji, color, d.name);
                var material = new THREE.SpriteMaterial({ map: texture, transparent: true });
                var sprite = new THREE.Sprite(material);

                // Base size on d.size but scale it down to make it accurate/small
                var scaleSize = (d.size || 20) * 0.25; // Shrunk modifier
                sprite.scale.set(scaleSize, scaleSize, 1);

                // Initialize coords exactly once. Altitude 0.012 sits perfectly on the crust.
                var pos = globe.getCoords(d.lat, d.lng, 0.012);
                sprite.position.x = pos.x;
                sprite.position.y = pos.y;
                sprite.position.z = pos.z;

                // Store object data for raycaster tooltips
                return sprite;
            });

        // Setup raycaster labels
        globe.customLayerLabel(function (d) {
            if (!d) return '';
            var catInfo = RasMirqabData.categories[d.cat] || { emoji: '📍', color: '#fff', labelAr: d.cat };
            var emoji = d.emoji || catInfo.emoji;
            var color = d.color || catInfo.color;

            if (d.name) {
                return '<div style="background: rgba(0,0,0,0.9); border: 1px solid ' + color + '; border-radius: 8px; padding: 12px; font-family: var(--font-ar), sans-serif; min-width: 180px;">' +
                    '<div style="color: ' + color + '; font-weight: bold; margin-bottom: 8px; font-size: 16px;">' + emoji + ' ' + d.name + '</div>' +
                    '<div style="color: #fff; font-size: 12px; margin-bottom: 4px;">النوع: ' + (catInfo.labelAr || catInfo.id) + '</div>' +
                    '<div style="color: #ddd; font-size: 11px;">' + (d.desc || '') + '</div>' +
                    '</div>';
            }
            return '';
        });
    }

    function updateGlobePaths() {
        if (!globe || !window.RasMirqabData || !RasMirqabData.complex) return;

        var pathsData = [];

        // Add Pipelines
        if (activeLayers['pipelines']) {
            pathsData = pathsData.concat(RasMirqabData.complex.pipelines.map(function (p) {
                return {
                    id: p.id,
                    name: p.nameAr,
                    path: p.points,
                    color: '#55efc4',
                    dashLength: 0.1,
                    dashGap: 0.05
                };
            }));
        }

        // Add Cables
        if (activeLayers['cables']) {
            pathsData = pathsData.concat(RasMirqabData.complex.cables.map(function (c) {
                return {
                    id: c.id,
                    name: c.nameAr,
                    path: c.points,
                    color: '#00cec9',
                    dashLength: 0.2,
                    dashGap: 0.1
                };
            }));
        }

        globe.pathsData(pathsData)
            .pathPoints('path')
            .pathColor(function (d) { return d.color; })
            .pathDashLength('dashLength')
            .pathDashGap('dashGap')
            .pathDashAnimateTime(3000)
            .pathStroke(1.5)
            .pathLabel(function (d) {
                return '<div style="background:rgba(0,0,0,0.8); padding:5px; border-radius:4px; border:1px solid ' + d.color + '; color:#fff; font-size:12px;">' + d.name + '</div>';
            });
    }



    /* ─── 2D MAP (Leaflet) ─── */
    function initMap2D() {
        var container = document.getElementById('map-container');
        if (!container || typeof L === 'undefined') return;

        map = L.map(container, {
            center: [25, 45],
            zoom: 3,
            zoomControl: false,
            attributionControl: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
        }).addTo(map);

        L.control.zoom({ position: 'topleft' }).addTo(map);

        updateMapMarkers();
    }

    function updateMapMarkers() {
        if (!map || !window.RasMirqabData) return;

        // Remove previous
        map.eachLayer(function (layer) {
            if (layer.options && layer.options.icon && layer.options.icon.options.className === 'dummy_marker') {
                map.removeLayer(layer);
            } else if (layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        RasMirqabData.points.forEach(function (p) {
            var cb = document.getElementById('layer-' + p.cat);
            var isActive = cb ? cb.checked : (activeLayers[p.cat] !== false);

            if (isActive) {
                var catInfo = RasMirqabData.categories[p.cat] || { emoji: '📍', color: '#fff', labelAr: p.cat };
                var color = p.color || catInfo.color;
                var emoji = p.emoji || catInfo.emoji;

                var anchorIcon = L.divIcon({
                    html: '<div style="font-size:16px;color:' + color + ';filter:drop-shadow(0 0 5px ' + color + ');">' + emoji + '</div>',
                    className: 'dummy_marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([p.lat, p.lng], { icon: anchorIcon })
                    .bindPopup('<b style="color:' + color + '">' + emoji + ' ' + p.name + '</b><br><small>' + catInfo.labelAr + '</small><br>' + (p.desc || ''))
                    .addTo(map);
            }
        });

        // Add 2D Polylines for Pipelines and Cables
        if (activeLayers['pipelines'] && RasMirqabData.complex.pipelines) {
            RasMirqabData.complex.pipelines.forEach(function (p) {
                var latlngs = p.points.map(function (pt) { return [pt[1], pt[0]]; }); // Leaflet is [lat, lon], data is [lon, lat]
                L.polyline(latlngs, { color: '#55efc4', weight: 2, className: 'dummy_marker' })
                    .bindPopup('<b>' + p.nameAr + '</b>')
                    .addTo(map);
            });
        }
        if (activeLayers['cables'] && RasMirqabData.complex.cables) {
            RasMirqabData.complex.cables.forEach(function (c) {
                var latlngs = c.points.map(function (pt) { return [pt[1], pt[0]]; });
                L.polyline(latlngs, { color: '#00cec9', weight: 2, dashArray: '5, 10', className: 'dummy_marker' })
                    .bindPopup('<b>' + c.nameAr + '</b>')
                    .addTo(map);
            });
        }
    }

    /* ─── LAYER TOGGLES ─── */
    function initLayerToggles() {
        var container = document.getElementById('layer-toggles');
        if (!container) return;

        // Add a toggle button for the layer panel
        var toggleBtn = document.createElement('button');
        toggleBtn.id = 'layer-toggle-btn';
        toggleBtn.title = 'Toggle Layers';
        toggleBtn.innerHTML = '🗂️'; // layers icon
        toggleBtn.style.cssText = 'position:absolute; top:10px; right:10px; background:none; border:none; color:var(--text-secondary); font-size:1.5rem; cursor:pointer; z-index:30;';
        toggleBtn.addEventListener('click', function () {
            container.classList.toggle('hidden');
        });
        document.body.appendChild(toggleBtn);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;letter-spacing:1px;';
        title.textContent = 'الطبقات ▼';
        container.appendChild(title);

        var innerScroll = document.createElement('div');
        innerScroll.style.cssText = 'max-height: 400px; overflow-y: auto; padding-right: 5px;';
        container.appendChild(innerScroll);

        Object.keys(RasMirqabData.categories).forEach(function (key) {
            var layer = RasMirqabData.categories[key];
            var lbl = document.createElement('label');
            lbl.className = 'layer-toggle';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'layer-' + key;
            cb.checked = activeLayers[key] !== false;
            cb.addEventListener('change', function () {
                activeLayers[key] = cb.checked;
                if (is3D) {
                    updateGlobeMarkers();
                    updateGlobePaths();
                    if (key === 'conflict_borders') {
                        // Borders removed for stability
                    }
                }
                else updateMapMarkers();
            });

            // Color indicator dot
            var dot = document.createElement('span');
            dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:4px;background:' + layer.color + ';box-shadow:0 0 5px ' + layer.color + ';';

            lbl.appendChild(cb);
            lbl.appendChild(dot);
            lbl.appendChild(document.createTextNode(' ' + layer.emoji + ' ' + layer.labelAr));
            innerScroll.appendChild(lbl);
        });
    }

    /* ─── LEGEND ─── */
    function initLegend() {
        var container = document.getElementById('globe-legend');
        if (!container) return;

        var items = [
            { label: 'نزاع', color: '#e74c3c' },
            { label: 'استخبارات', color: '#3498db' },
            { label: 'قواعد', color: '#9b59b6' },
            { label: 'نووي', color: '#e67e22' },
            { label: 'بحري', color: '#1abc9c' },
        ];

        items.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'legend-item';
            div.innerHTML =
                '<span class="legend-dot" style="background:' + item.color + ';box-shadow:0 0 6px ' + item.color + ';"></span>' +
                '<span>' + item.label + '</span>';
            container.appendChild(div);
        });
    }

    /* ─── TOGGLE 3D ↔ 2D ─── */
    function toggle() {
        is3D = !is3D;
        var globeEl = document.getElementById('globe-container');
        var mapEl = document.getElementById('map-container');

        if (is3D) {
            globeEl.classList.remove('hidden');
            mapEl.classList.add('hidden');
        } else {
            globeEl.classList.add('hidden');
            mapEl.classList.remove('hidden');
            if (!map) initMap2D();
            else {
                setTimeout(function () { map.invalidateSize(); }, 100);
                updateMapMarkers();
            }
        }
    }

    /* ─── UPDATE GLOBE TIME DISPLAY ─── */
    function updateTime() {
        var el = document.getElementById('globe-time');
        if (!el) return;
        var now = new Date();
        var opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Riyadh' };
        el.textContent = now.toLocaleDateString('ar-SA', opts);
    }

    /* ─── DIMENSION TOGGLE (2D/3D) ─── */
    function initDimensionToggle() {
        var toggles = document.querySelectorAll('.dimension-toggle');
        toggles.forEach(function (toggleContainer) {
            var btns = toggleContainer.querySelectorAll('.dim-btn');
            btns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var dim = this.getAttribute('data-dim');
                    if ((dim === '3d' && is3D) || (dim === '2d' && !is3D)) return;
                    syncToggleButtons(dim);
                    toggleView(dim);
                });
            });
        });
    }

    function syncToggleButtons(dim) {
        var toggles = document.querySelectorAll('.dimension-toggle');
        toggles.forEach(function (toggleContainer) {
            var btns = toggleContainer.querySelectorAll('.dim-btn');
            btns.forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-dim') === dim);
            });
        });
    }

    function toggleView(dim) {
        var globeContainer = document.getElementById('globe-container');
        var mapContainer = document.getElementById('map-container');

        if (dim === '2d') {
            is3D = false;
            globeContainer.classList.add('hidden');
            mapContainer.classList.remove('hidden');
            if (!map) initMap2D();
            updateMapMarkers(); // Ensure markers are fresh
        } else {
            is3D = true;
            mapContainer.classList.add('hidden');
            globeContainer.classList.remove('hidden');
            updateGlobeMarkers();
        }
    }

    /* ─── TRIGGER PULSE FROM EXTERNAL EVENT ─── */
    function triggerPulse(locationKeyword) {
        if (!is3D || !globe) return;

        // Note: For native Three.js sprites, highlighting can be handled via material adjustments.
        // As a simpler fallback, just pan the camera:
        var match = null;
        // Since we decoupled the main points data array to dynamic markers in updateGlobeMarkers,
        // we'll approximate a camera movement
        globe.pointOfView({ lat: 31.7683, lng: 35.2137, altitude: 0.8 }, 1500);
    }

    /* ─── FALLBACK GLOBE ─── */
    function initFallbackGlobe() {
        var container = document.getElementById('globe-container');
        if (!container) return;

        container.style.cssText = 'background: radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a0a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; height: 100%;';

        var fallbackContent = document.createElement('div');
        fallbackContent.style.cssText = 'text-align: center; color: #ff6a00; font-family: var(--font-ar), sans-serif; z-index: 10; position: relative;';
        fallbackContent.innerHTML =
            '<h3 style="margin-bottom: 20px; font-size: 1.5rem;">🌍 الوضع العالمي</h3>' +
            '<div style="font-size: 0.9rem; opacity: 0.8;">عرض الخريطة ثلاثية الأبعاد غير متاح</div>' +
            '<div style="margin-top: 15px;">' +
            '<button onclick="window.RasMirqabGlobe && window.RasMirqabGlobe.toggle()" style="padding: 8px 16px; background: #ff6a00; color: white; border: none; border-radius: 6px; cursor: pointer;">التبديل للخريطة 2D</button>' +
            '</div>';

        container.appendChild(fallbackContent);

        // Add some animated dots to simulate activity
        for (var i = 0; i < 8; i++) {
            var dot = document.createElement('div');
            var lat = 20 + Math.random() * 40;
            var lng = 10 + Math.random() * 80;
            dot.style.cssText = 'position: absolute; width: 8px; height: 8px; background: #ff6a00; border-radius: 50%; left: ' + lng + '%; top: ' + lat + '%; box-shadow: 0 0 10px #ff6a00; animation: pulse 2s infinite;';
            dot.style.animationDelay = (i * 0.5) + 's';
            container.appendChild(dot);
        }

        // Add CSS animation
        if (!document.getElementById('globe-fallback-styles')) {
            var style = document.createElement('style');
            style.id = 'globe-fallback-styles';
            style.textContent = '@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }';
            document.head.appendChild(style);
        }

        console.log('Fallback globe initialized');
    }

    return {
        init: init,
        toggle: toggle,
        updateTime: updateTime,
        triggerPulse: triggerPulse
    };
})();
