import Database from "@tauri-apps/plugin-sql";
import type { Record, NewRecord, CustomCategory } from "../types";

let db: Database | null = null;

/** 获取数据库实例（单例） */
async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:heimabookkeeping.db");
    await initTables();
  }
  return db;
}

/** 创建数据库表 */
async function initTables(): Promise<void> {
  const database = db!;
  await database.execute(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_main TEXT NOT NULL,
      category_sub TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  // 用户自定义分类表（每个分类条目 = 一个大类 + 一个小类）
  await database.execute(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      main_name TEXT NOT NULL,
      sub_name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📌',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 旧数据库兼容：早期版本的表没有 icon 列，这里补上（新库执行会报"列已存在"，忽略即可）
  try {
    await database.execute(
      "ALTER TABLE custom_categories ADD COLUMN icon TEXT NOT NULL DEFAULT '📌'"
    );
  } catch {
    // 列已存在，无需处理
  }
}

/** 添加一条记录 */
export async function addRecord(record: NewRecord): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO records (type, amount, category_main, category_sub, date, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [record.type, record.amount, record.category_main, record.category_sub, record.date, record.note]
  );
  return result.lastInsertId as number;
}

/** 删除一条记录 */
export async function deleteRecord(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM records WHERE id = $1", [id]);
}

/** 查询记录列表（支持筛选） */
export async function getRecords(filter?: {
  type?: "expense" | "income";
  category_main?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<Record[]> {
  const database = await getDb();
  let sql = "SELECT * FROM records WHERE 1=1";
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filter?.type) {
    sql += ` AND type = $${paramIndex++}`;
    params.push(filter.type);
  }
  if (filter?.category_main) {
    sql += ` AND category_main = $${paramIndex++}`;
    params.push(filter.category_main);
  }
  if (filter?.date_from) {
    sql += ` AND date >= $${paramIndex++}`;
    params.push(filter.date_from);
  }
  if (filter?.date_to) {
    sql += ` AND date <= $${paramIndex++}`;
    params.push(filter.date_to);
  }

  sql += " ORDER BY date DESC, created_at DESC";

  if (filter?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filter.limit);
  }
  if (filter?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(filter.offset);
  }

  return await database.select<Record[]>(sql, params);
}

/** 获取月度收支统计 */
export async function getMonthlyStats(year: number, month: number): Promise<{
  total_income: number;
  total_expense: number;
}> {
  const database = await getDb();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const rows = await database.select<[{ type: string; total: number }]>(
    `SELECT type, SUM(amount) as total FROM records
     WHERE strftime('%Y-%m', date) = $1
     GROUP BY type`,
    [monthStr]
  );

  let total_income = 0;
  let total_expense = 0;
  for (const row of rows) {
    if (row.type === "income") total_income = row.total;
    if (row.type === "expense") total_expense = row.total;
  }
  return { total_income, total_expense };
}

/** 获取指定月份的分类支出统计 */
export async function getCategoryStats(year: number, month: number): Promise<
  { category_main: string; total: number }[]
> {
  const database = await getDb();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  return await database.select(
    `SELECT category_main, SUM(amount) as total FROM records
     WHERE type = 'expense' AND strftime('%Y-%m', date) = $1
     GROUP BY category_main
     ORDER BY total DESC`,
    [monthStr]
  );
}

/** 获取指定月份每日支出趋势 */
export async function getDailyTrend(year: number, month: number): Promise<
  { date: string; expense: number; income: number }[]
> {
  const database = await getDb();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  return await database.select(
    `SELECT date,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income
     FROM records
     WHERE strftime('%Y-%m', date) = $1
     GROUP BY date
     ORDER BY date ASC`,
    [monthStr]
  );
}

/** 导出全部记录 */
export async function getAllRecords(): Promise<Record[]> {
  const database = await getDb();
  return await database.select<Record[]>("SELECT * FROM records ORDER BY date DESC, created_at DESC");
}

/* ==================== 用户自定义分类 ==================== */

/** 获取某类型（支出/收入）的所有自定义分类条目 */
export async function getCustomCategories(type: "expense" | "income"): Promise<CustomCategory[]> {
  const database = await getDb();
  return await database.select<CustomCategory[]>(
    `SELECT * FROM custom_categories WHERE type = $1 ORDER BY main_name, sub_name`,
    [type]
  );
}

/** 新增一个自定义分类（大类 + 小类 + 图标） */
export async function addCustomCategory(
  type: "expense" | "income",
  main_name: string,
  sub_name: string,
  icon: string
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    `INSERT INTO custom_categories (type, main_name, sub_name, icon) VALUES ($1, $2, $3, $4)`,
    [type, main_name, sub_name, icon]
  );
  return result.lastInsertId as number;
}

/** 修改自定义分类的名称和图标 */
export async function renameCustomCategory(
  id: number,
  main_name: string,
  sub_name: string,
  icon: string
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE custom_categories SET main_name = $1, sub_name = $2, icon = $3 WHERE id = $4`,
    [main_name, sub_name, icon, id]
  );
}

/** 删除一条自定义分类（一个小类） */
export async function deleteCustomCategory(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM custom_categories WHERE id = $1", [id]);
}

/** 删除整个自定义大类（连同它下面的所有小类） */
export async function deleteCustomCategoryByMain(
  type: "expense" | "income",
  main_name: string
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "DELETE FROM custom_categories WHERE type = $1 AND main_name = $2",
    [type, main_name]
  );
}

/** 重命名整个自定义大类（大类名 + 图标），更新该大类下所有行 */
export async function renameCustomCategoryByMain(
  type: "expense" | "income",
  oldMainName: string,
  newMainName: string,
  icon: string
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE custom_categories SET main_name = $1, icon = $2 WHERE type = $3 AND main_name = $4`,
    [newMainName, icon, type, oldMainName]
  );
}
