import mysql from 'mysql2/promise';
import { getMysqlConfig } from './mysqlUserFields.js';

/** Tables jamais vidées ni modifiées (config, menus, modules, dictionnaires…) */
const UNTOUCHABLE_TABLES = new Set([
  'llx_const',
  'llx_usergroup',
  'llx_rights_def',
  'llx_menu',
  'llx_boxes',
  'llx_boxes_def',
  'llx_module',
]);

/** Tables utilisateur : jamais TRUNCATE, seulement suppression des non-admin */
const USER_MANAGED_TABLES = new Set([
  'llx_user',
  'llx_usergroup_user',
  'llx_user_rights',
  'llx_user_param',
  'llx_user_alert',
  'llx_user_clicktodial',
  'llx_user_employment',
  'llx_user_rib',
]);

const USER_LINKED_TABLES = [...USER_MANAGED_TABLES].filter((t) => t !== 'llx_user');

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function shouldPreserveTable(tableName) {
  if (UNTOUCHABLE_TABLES.has(tableName)) {
    return true;
  }

  if (USER_MANAGED_TABLES.has(tableName)) {
    return true;
  }

  if (tableName.startsWith('llx_c_')) {
    return true;
  }

  return false;
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

export async function getAdminUserIds(connection) {
  const [byLogin] = await connection.query(
    "SELECT rowid FROM llx_user WHERE login = 'admin'",
  );

  if (byLogin.length > 0) {
    return byLogin.map((row) => row.rowid);
  }

  const [fallback] = await connection.query(
    'SELECT rowid FROM llx_user WHERE admin = 1 ORDER BY rowid ASC LIMIT 1',
  );

  return fallback.map((row) => row.rowid);
}

/** Recrée admin + groupe Administrators si supprimés par erreur */
export async function ensureAdminUser(connection) {
  const existing = await getAdminUserIds(connection);
  if (existing.length > 0) {
    return { restored: false, adminId: existing[0] };
  }

  const datec = nowSql();

  const [insertResult] = await connection.query(
    `INSERT INTO llx_user (
      entity, admin, login, pass, pass_crypted, lastname, statut, datec, employee
    ) VALUES (1, 1, 'admin', 'admin', NULL, 'SuperAdmin', 1, ?, 0)`,
    [datec],
  );

  const adminId = insertResult.insertId;

  let groupId;
  const [groups] = await connection.query(
    "SELECT rowid FROM llx_usergroup WHERE nom = 'Administrators' ORDER BY rowid LIMIT 1",
  );

  if (groups.length === 0) {
    const [groupInsert] = await connection.query(
      "INSERT INTO llx_usergroup (nom, entity, datec) VALUES ('Administrators', 1, ?)",
      [datec],
    );
    groupId = groupInsert.insertId;
  } else {
    groupId = groups[0].rowid;
  }

  const [links] = await connection.query(
    'SELECT rowid FROM llx_usergroup_user WHERE fk_user = ? AND fk_usergroup = ?',
    [adminId, groupId],
  );

  if (links.length === 0) {
    await connection.query(
      'INSERT INTO llx_usergroup_user (entity, fk_user, fk_usergroup) VALUES (1, ?, ?)',
      [adminId, groupId],
    );
  }

  return { restored: true, adminId, login: 'admin', defaultPassword: 'admin' };
}

async function getUserCleanupPreview(connection) {
  const adminIds = await getAdminUserIds(connection);

  if (adminIds.length === 0) {
    throw new Error('Utilisateur admin introuvable dans llx_user');
  }

  const [allUsers] = await connection.query(
    'SELECT rowid, login, admin, lastname, firstname FROM llx_user ORDER BY rowid',
  );

  const usersToKeep = allUsers.filter((user) => adminIds.includes(user.rowid));
  const usersToRemove = allUsers.filter((user) => !adminIds.includes(user.rowid));

  return {
    adminIds,
    usersToKeep,
    usersToRemove,
    userLinkedTables: USER_LINKED_TABLES,
  };
}

export async function getDolibarrResetPreview() {
  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    await ensureAdminUser(connection);

    const [rows] = await connection.query('SHOW TABLES');
    const tableKey = `Tables_in_${getMysqlConfig().database}`;
    const allTables = rows.map((row) => row[tableKey]);

    const tablesToTruncate = allTables.filter(
      (table) => table.startsWith('llx_') && !shouldPreserveTable(table),
    );
    const preservedTables = allTables.filter(
      (table) => table.startsWith('llx_') && shouldPreserveTable(table),
    );

    const userCleanup = await getUserCleanupPreview(connection);

    return {
      database: getMysqlConfig().database,
      totalTables: allTables.length,
      tablesToTruncate: tablesToTruncate.sort(),
      preservedTables: preservedTables.sort(),
      usersToKeep: userCleanup.usersToKeep,
      usersToRemove: userCleanup.usersToRemove,
      userLinkedTables: userCleanup.userLinkedTables,
    };
  } finally {
    await connection.end();
  }
}

async function cleanupNonAdminUsers(connection, adminIds) {
  const placeholders = adminIds.map(() => '?').join(', ');
  const userLinkedTables = [];

  for (const table of USER_LINKED_TABLES) {
    try {
      if (!(await tableExists(connection, table))) {
        continue;
      }

      const [result] = await connection.query(
        `DELETE FROM \`${table}\` WHERE fk_user NOT IN (${placeholders})`,
        adminIds,
      );

      userLinkedTables.push({ table, deletedRows: result.affectedRows });
    } catch (error) {
      userLinkedTables.push({ table, error: error.message });
    }
  }

  const [userDelete] = await connection.query(
    `DELETE FROM llx_user WHERE rowid NOT IN (${placeholders})`,
    adminIds,
  );

  return {
    deletedUsers: userDelete.affectedRows,
    keptAdminIds: adminIds,
    userLinkedTables,
  };
}

export async function resetDolibarrData() {
  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    await ensureAdminUser(connection);

    const adminIds = await getAdminUserIds(connection);

    const [rows] = await connection.query('SHOW TABLES');
    const tableKey = `Tables_in_${getMysqlConfig().database}`;
    const allTables = rows.map((row) => row[tableKey]);

    const tablesToTruncate = allTables.filter(
      (table) => table.startsWith('llx_') && !shouldPreserveTable(table),
    );

    const [allUsers] = await connection.query(
      'SELECT rowid, login, admin, lastname, firstname FROM llx_user ORDER BY rowid',
    );
    const usersToKeep = allUsers.filter((user) => adminIds.includes(user.rowid));

    const truncated = [];
    const failed = [];

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToTruncate) {
      try {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        truncated.push(table);
      } catch (error) {
        failed.push({ table, error: error.message });
      }
    }

    const userCleanup = await cleanupNonAdminUsers(connection, adminIds);

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const [adminCheck] = await connection.query(
      `SELECT rowid, login FROM llx_user WHERE rowid IN (${adminIds.map(() => '?').join(', ')})`,
      adminIds,
    );

    if (adminCheck.length === 0) {
      throw new Error('Erreur critique : l\'utilisateur admin a été supprimé');
    }

    return {
      database: getMysqlConfig().database,
      truncatedCount: truncated.length,
      truncated,
      usersKept: usersToKeep,
      deletedUsers: userCleanup.deletedUsers,
      userLinkedTables: userCleanup.userLinkedTables,
      failed,
    };
  } finally {
    await connection.end();
  }
}
