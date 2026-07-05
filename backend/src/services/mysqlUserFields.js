import mysql from 'mysql2/promise';

export function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE || 'dolibarr',
  };
}

export async function setUserWeeklyHours(userId, weeklyhours) {
  if (weeklyhours == null || Number.isNaN(Number(weeklyhours))) {
    return;
  }

  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    await connection.query('UPDATE llx_user SET weeklyhours = ? WHERE rowid = ?', [
      Number(weeklyhours),
      Number(userId),
    ]);
  } finally {
    await connection.end();
  }
}

export async function getWeeklyHoursByUserIds(userIds) {
  const ids = userIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return new Map();
  }

  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT rowid, weeklyhours FROM llx_user WHERE rowid IN (${placeholders})`,
      ids,
    );

    return new Map(
      rows.map((row) => [
        String(row.rowid),
        row.weeklyhours != null && row.weeklyhours !== '' ? Number(row.weeklyhours) : null,
      ]),
    );
  } finally {
    await connection.end();
  }
}
