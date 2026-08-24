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

/** 分类结构 */
export interface Category {
  main: string;
  icon: string;
  subs: string[];
}

/** 用户自定义分类（数据库中的一条记录 = 大类 + 小类） */
export interface CustomCategory {
  id: number;
  type: "expense" | "income";
  main_name: string;
  sub_name: string;
  icon: string;
  created_at: string;
}

