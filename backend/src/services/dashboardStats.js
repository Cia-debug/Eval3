import mysql from 'mysql2/promise';
import { getMysqlConfig } from './mysqlUserFields.js';

const GENDER_LABELS = {
  man: 'Homme',
  woman: 'Femme',
  unknown: 'Non renseigné',
};

function roundAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

function mapGenderRow(row) {
  const genre = row.genre || 'unknown';
  return {
    genre,
    label: GENDER_LABELS[genre] || genre,
    total: roundAmount(row.total),
    count: Number(row.count),
  };
}

export async function getSalaryDashboardStats() {
  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    const [byGenreRows] = await connection.query(`
      SELECT
        CASE
          WHEN u.gender = 'man' OR u.civility = 'MR' THEN 'man'
          WHEN u.gender = 'woman' OR u.civility = 'MME' THEN 'woman'
          ELSE 'unknown'
        END AS genre,
        SUM(s.amount) AS total,
        COUNT(s.rowid) AS count
      FROM llx_salary s
      INNER JOIN llx_user u ON u.rowid = s.fk_user
      WHERE u.employee = 1
        AND u.ref_employee IS NOT NULL
        AND u.ref_employee <> ''
      GROUP BY genre
      ORDER BY total DESC
    `);

    const [byMonthRows] = await connection.query(`
      SELECT
        DATE_FORMAT(s.datesp, '%Y-%m') AS month,
        SUM(s.amount) AS total,
        COUNT(s.rowid) AS count
      FROM llx_salary s
      INNER JOIN llx_user u ON u.rowid = s.fk_user
      WHERE u.employee = 1
        AND u.ref_employee IS NOT NULL
        AND u.ref_employee <> ''
        AND s.datesp IS NOT NULL
      GROUP BY DATE_FORMAT(s.datesp, '%Y-%m')
      ORDER BY month ASC
    `);

    const [summaryRows] = await connection.query(`
      SELECT
        COUNT(s.rowid) AS salaryCount,
        COALESCE(SUM(s.amount), 0) AS totalAmount
      FROM llx_salary s
      INNER JOIN llx_user u ON u.rowid = s.fk_user
      WHERE u.employee = 1
        AND u.ref_employee IS NOT NULL
        AND u.ref_employee <> ''
    `);

    const [employeeGenderRows] = await connection.query(`
      SELECT
        CASE
          WHEN u.gender = 'man' OR u.civility = 'MR' THEN 'man'
          WHEN u.gender = 'woman' OR u.civility = 'MME' THEN 'woman'
          ELSE 'unknown'
        END AS genre,
        COUNT(u.rowid) AS count
      FROM llx_user u
      WHERE u.employee = 1
        AND u.ref_employee IS NOT NULL
        AND u.ref_employee <> ''
      GROUP BY genre
    `);

    const summary = summaryRows[0] || { salaryCount: 0, totalAmount: 0 };
    const genderCounts = { man: 0, woman: 0, unknown: 0 };
    employeeGenderRows.forEach((row) => {
      genderCounts[row.genre] = Number(row.count);
    });

    return {
      salaryCount: Number(summary.salaryCount),
      totalAmount: roundAmount(summary.totalAmount),
      manCount: genderCounts.man,
      womanCount: genderCounts.woman,
      byGenre: byGenreRows.map(mapGenderRow),
      byMonth: byMonthRows.map((row) => ({
        month: row.month,
        total: roundAmount(row.total),
        count: Number(row.count),
      })),
    };
  } finally {
    await connection.end();
  }
}
