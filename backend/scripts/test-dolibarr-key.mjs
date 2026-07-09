const NEW_KEY = 'af8e07baaa684d3a7c27dc1a42a47b6f8a863f93';
const OLD_KEY = 'ebe9face4ce60602f8f4d71491cd60a6113ff76f';
const base = 'http://localhost/dolibarr/htdocs/api/index.php';

async function testKey(label, key) {
  const res = await fetch(`${base}/users?limit=1`, {
    headers: { DOLAPIKEY: key, Accept: 'application/json' },
  });
  const text = await res.text();
  const ok = res.ok;
  console.log(`${label}: ${res.status} ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) {
    try {
      const data = JSON.parse(text);
      console.log('  ', data.error?.message || text.slice(0, 120));
    } catch {
      console.log('  ', text.slice(0, 120));
    }
  } else {
    console.log('  employes accessibles');
  }
}

await testKey('Nouvelle cle', NEW_KEY);
await testKey('Ancienne cle', OLD_KEY);
