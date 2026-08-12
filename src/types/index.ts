/** 账目记录 */
export interface Record {
  id: number;
  type: "expense" | "income";
  amount: number;
  category_main: string;
  category_sub: string;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string; // ISO 8601
}

/** 新建记录（不含 id 和 created_at） */
export interface NewRecord {
  type: "expense" | "income";
  amount: number;
  category_main: string;
  category_sub: string;
  date: string;
  note: string;
}

/** 记录筛选条件 */
export interface RecordFilter {
  type?: "expense" | "income" | "all";
  category_main?: string;
  date_from?: string;
  date_to?: string;
}

/** 分类结构 */
export interface Category {
  main: string;
  icon: string;
  subs: string[];
}

/** 月度统计 */
export interface MonthlyStats {
  month: string; // YYYY-MM
  total_income: number;
  total_expense: number;
  balance: number;
}

/** 分类统计 */
export interface CategoryStats {
  category_main: string;
  total: number;
  percentage: number;
}
