/* ═══════════════════════════════════════════════
   Apify Token Tester for Ras Mirqab
   Usage: node scripts/test-apify.js YOUR_TOKEN
   ═══════════════════════════════════════════════ */

const https = require('https');

const APIFY_TOKEN = process.argv[2];
const LIST_ID = '2031445708524421549';

if (!APIFY_TOKEN) {
    console.error('❌ Error: Please provide your Apify API Token.');
    console.log('Example: node scripts/test-apify.js apify_api_XXXXX');
    process.exit(1);
}

console.log(`🚀 Testing Apify Token: ${APIFY_TOKEN.substring(0, 8)}...`);

async function test() {
    const runUrl = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs?token=${APIFY_TOKEN}`;
    const payload = JSON.stringify({
        "listIds": [LIST_ID],
        "maxItems": 5
    });

    console.log('📡 Starting Actor Run...');
    
    const runRes = await new Promise((resolve, reject) => {
        const req = https.request(runUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });

    if (runRes.error) {
        console.error('❌ Apify API Error:', runRes.error.message || JSON.stringify(runRes));
        process.exit(1);
    }

    const runId = runRes.data.id;
    console.log(`✅ Run Started! ID: ${runId}`);
    console.log(`🔗 Monitor here: https://console.apify.com/actors/runs/${runId}`);
    console.log('\nWaiting for completion (Polling every 5s)...');

    let status = 'RUNNING';
    while (status === 'RUNNING') {
        await new Promise(r => setTimeout(r, 5000));
        https.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                const stat = JSON.parse(d);
                status = stat.data.status;
                process.stdout.write('.');
                if (status === 'SUCCEEDED') {
                    console.log('\n\n✨ SUCCESS! Your token works and items were found.');
                    process.exit(0);
                } else if (status !== 'RUNNING') {
                    console.log(`\n\n❌ Run finished with status: ${status}`);
                    process.exit(1);
                }
            });
        });
    }
}

test().catch(err => {
    console.error('❌ Critical Error:', err.message);
});
