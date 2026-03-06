/* ═══════════════════════════════════════════════
   LIVE WEBCAMS WIDGET
   ═══════════════════════════════════════════════ */

var LiveWebcamsWidget = (function () {
    var categories = [
        { id: 'iran', name: 'IRAN ATTACKS', class: 'btn-danger' },
        { id: 'all', name: 'ALL' },
        { id: 'mideast', name: 'MIDEAST' },
        { id: 'europe', name: 'EUROPE' },
        { id: 'americas', name: 'AMERICAS' },
        { id: 'asia', name: 'ASIA' },
        { id: 'space', name: 'SPACE' }
    ];

    var webcamData = {
        iran: [
            { title: 'TEHRAN', videoId: '-zGuR1qVKrU' },
            { title: 'TEL AVIV', videoId: 'gmtlJ_m2r5A' },
            { title: 'JERUSALEM', videoId: 'fIurYTprwzg' },
            { title: 'MIDDLE EAST', videoId: '4E-iFtUM2kk' }
        ],
        all: [
            { title: 'TEHRAN', videoId: '-zGuR1qVKrU' },
            { title: 'TEL AVIV', videoId: 'gmtlJ_m2r5A' },
            { title: 'JERUSALEM', videoId: 'fIurYTprwzg' },
            { title: 'MIDDLE EAST', videoId: '4E-iFtUM2kk' },
            { title: 'NEW YORK', videoId: '1-iS7LybxzI' },
            { title: 'LONDON', videoId: 'HpdO5K_3W6M' }
        ],
        mideast: [
            { title: 'TEHRAN', videoId: '-zGuR1qVKrU' },
            { title: 'TEL AVIV', videoId: 'gmtlJ_m2r5A' },
            { title: 'JERUSALEM', videoId: 'fIurYTprwzg' }
        ],
        europe: [
            { title: 'LONDON', videoId: 'HpdO5K_3W6M' },
            { title: 'PARIS', videoId: '3cursYA8HMeo' } // Placeholder (France 24 feed often has cams)
        ],
        americas: [
            { title: 'NEW YORK', videoId: '1-iS7LybxzI' },
            { title: 'WASHINGTON', videoId: 'm47Y9-L6Czk' }
        ],
        asia: [
            { title: 'TOKYO', videoId: 'n_X1E-S6j6Y' },
            { title: 'SEOUL', videoId: '6D-A6PAt868' }
        ],
        space: [
            { title: 'ISS LIVE', videoId: 'P9C25Un7xaM' }
        ]
    };

    var activeCategory = 'iran';

    function render() {
        return {
            header:
                '<div class="widget-header">' +
                '  <div class="widget-title">LIVE WEBCAMS</div>' +
                '  <div class="widget-actions">' +
                '    <button class="widget-action-btn" title="Grid View">🔲</button>' +
                '    <button class="widget-action-btn" title="Full Screen">🏁</button>' +
                '  </div>' +
                '</div>',
            body:
                '<div class="widget-body" style="padding: 0; display: flex; flex-direction: column; align-items: stretch;">' +
                '  <div class="webcam-categories-bar" id="webcam-cats" style="width: 100%;">' +
                renderCategories() +
                '  </div>' +
                '  <div class="webcam-grid" id="webcam-container" style="width: 100%; flex: 1;"></div>' +
                '</div>'
        };
    }

    function renderCategories() {
        var html = '';
        categories.forEach(function (cat) {
            var cls = 'webcam-cat-btn';
            if (cat.id === activeCategory) cls += ' active';
            if (cat.class) cls += ' ' + cat.class;
            html += '<button class="' + cls + '" data-id="' + cat.id + '">' + cat.name + '</button>';
        });
        return html;
    }

    function init() {
        updateGrid();
        initEvents();
    }

    function initEvents() {
        var bar = document.getElementById('webcam-cats');
        if (!bar) return;
        bar.addEventListener('click', function (e) {
            var btn = e.target.closest('.webcam-cat-btn');
            if (!btn) return;
            activeCategory = btn.dataset.id;

            // UI Update
            bar.querySelectorAll('.webcam-cat-btn').forEach(function (b) {
                b.classList.toggle('active', b.dataset.id === activeCategory);
            });

            updateGrid();
        });
    }

    function updateGrid() {
        var container = document.getElementById('webcam-container');
        if (!container) return;

        var cams = webcamData[activeCategory] || [];
        var html = '';

        cams.forEach(function (cam) {
            html +=
                '<div class="webcam-cell">' +
                '  <div class="webcam-label" style="right: 10px; left: auto;"><span class="live-dot-red"></span> ' + cam.title + '</div>' +
                '  <iframe src="https://www.youtube.com/embed/' + cam.videoId + '?autoplay=1&mute=1&rel=0" ' +
                '    allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>' +
                '</div>';
        });

        container.innerHTML = html;

        // Adjust grid columns based on count
        if (cams.length === 1) {
            container.style.gridTemplateColumns = '1fr';
        } else if (cams.length === 2) {
            container.style.gridTemplateColumns = '1fr 1fr';
        } else {
            container.style.gridTemplateColumns = '1fr 1fr';
        }
    }

    return { render: render, init: init };
})();
