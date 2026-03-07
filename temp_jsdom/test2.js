const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('../index.html', 'utf-8');
const { window } = new JSDOM(html, { url: "file:///C:/Users/abady/Downloads/%D8%B1%D8%A7%D8%B3%20%D9%85%D8%B1%D9%82%D8%A7%D8%A8/index.html" });

global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.localStorage = { getItem: () => null, setItem: () => {} };

// Mock canvas and GL
window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {}
});

function loadScript(path) {
    try {
        const code = fs.readFileSync('../' + path, 'utf-8');
        console.log('Evaluating', path);
        window.eval(code);
    } catch (e) {
        console.error('Error in', path, e);
    }
}

const scripts = [
    'src/assets/three.min.js',
    'src/assets/globe.gl.min.js',
    'src/assets/leaflet.js',
    'src/data/feeds.js',
    'src/data/conflicts.js',
    'src/data/intelligence.js',
    'src/globe.js',
    'src/widgets/breaking-news.js',
    'src/widgets/live-tv.js',
    'src/widgets/live-webcams.js',
    'src/widgets/world-clock.js',
    'src/widgets/gold-silver.js',
    'src/widgets/sanctions-trade.js',
    'src/widgets/cyber-intel.js',
    'src/widgets/health-bio.js',
    'src/widgets/military-aircraft.js',
    'src/widgets/commodities.js',
    'src/widgets/market-overview.js',
    'src/widgets/conflict-monitor.js',
    'src/grid.js',
    'src/main.js'
];

for (const s of scripts) {
    loadScript(s);
}

console.log("Waiting for boot to complete...");
setTimeout(() => {
    console.log("Done.");
    process.exit(0);
}, 2000);
