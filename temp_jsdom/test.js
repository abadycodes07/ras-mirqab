const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('../index.html', 'utf-8');

const { window } = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously",
    resources: "usable"
});

window.console.log = function(...args) { console.log('LOG:', ...args); };
window.console.warn = function(...args) { console.warn('WARN:', ...args); };
window.console.error = function(...args) { console.error('ERROR:', ...args); };

window.addEventListener("error", (event) => {
    console.error("Uncaught DOM Exception:", event.error);
});

setTimeout(() => {
    console.log("Done waiting for scripts to run.");
    process.exit(0);
}, 3000);
