import 'dotenv/config';

const key = process.env.DOLIBARR_API_KEY;
const base = process.env.DOLIBARR_API_URL;

console.log('DOLIBARR_API_KEY:', key ? `${key.slice(0, 8)}...` : '(vide)');
console.log('DOLIBARR_API_URL:', base);

async function testDolibarr() {
  const url = `${base}/users?sortfield=t.rowid&sortorder=ASC&limit=1`;
  const res = await fetch(url, {
    headers: { DOLAPIKEY: key, Accept: 'application/json' },
  });
  const text = await res.text();
  console.log('\n=== Dolibarr direct ===');
  console.log('Status:', res.status);
  console.log('Body:', text.slice(0, 400));
}

async function testBackend() {
  const url = 'http://localhost:3001/api/frontoffice/employees';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('\n=== Backend /employees ===');
    console.log('Status:', res.status);
    console.log('Body:', text.slice(0, 400));
  } catch (e) {
    console.log('\n=== Backend /employees ===');
    console.log('ERREUR connexion:', e.message);
  }
}

await testDolibarr();
await testBackend();
