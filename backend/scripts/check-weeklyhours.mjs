import 'dotenv/config';
import mysql from 'mysql2/promise';

const c = await mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'dolibarr',
});

const [cols] = await c.query("SHOW COLUMNS FROM llx_user LIKE 'weeklyhours'");
console.log('user col', cols);

try {
  const [emp] = await c.query('SELECT fk_user, weeklyhours FROM llx_user_employment LIMIT 5');
  console.log('employment', emp);
} catch (e) {
  console.log('employment table error', e.message);
}

await c.end();
