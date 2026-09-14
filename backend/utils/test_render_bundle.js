const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const page = await get('https://bps-chakki.onrender.com/admin');
  console.log('HTML status:', page.status);
  const match = page.body.match(/src="(\/assets\/[^"]+)"/);
  console.log('JS url:', match ? match[1] : 'NOT FOUND');
  if (match) {
    const js = await get('https://bps-chakki.onrender.com' + match[1]);
    console.log('JS status:', js.status, 'bytes:', js.body.length);
    console.log('JS first 200 chars:', js.body.slice(0, 200));
  }
}

run().catch(console.error);
