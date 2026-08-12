import type { Category } from "../types";

/** 默认支出分类（两级） */
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { main: "餐饮", icon: "🍽️", subs: ["早餐", "午餐", "晚餐", "零食", "饮品", "聚餐"] },
  { main: "交通", icon: "🚗", subs: ["公交", "地铁", "打车", "加油", "停车", "火车/高铁", "飞机"] },
  { main: "购物", icon: "🛒", subs: ["日用品", "数码产品", "家居", "书籍", "化妆品"] },
  { main: "居住", icon: "🏠", subs: ["房租/房贷", "水电燃气", "物业费", "维修", "清洁"] },
  { main: "娱乐", icon: "🎮", subs: ["电影", "游戏", "旅游", "运动健身", "KTV", "演出"] },
  { main: "医疗", icon: "💊", subs: ["门诊", "药品", "体检", "住院"] },
  { main: "教育", icon: "📚", subs: ["学费", "培训", "书籍文具", "考试"] },
  { main: "通讯", icon: "📱", subs: ["话费", "网费", "快递"] },
  { main: "服饰", icon: "👗", subs: ["衣服", "鞋子", "配饰", "包包"] },
  { main: "其他", icon: "📦", subs: ["礼物", "捐赠", "其他"] },
];

/** 默认收入分类（只有一级，sub 为固定值） */
export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { main: "工资", icon: "💰", subs: ["工资"] },
  { main: "红包", icon: "🧧", subs: ["红包"] },
  { main: "理财", icon: "📈", subs: ["理财"] },
  { main: "兼职", icon: "💼", subs: ["兼职"] },
  { main: "其他收入", icon: "📦", subs: ["其他收入"] },
];

/** 根据类型获取默认分类 */
export function getDefaultCategories(type: "expense" | "income"): Category[] {
  return type === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
}

/** 根据大类获取图标 */
export function getCategoryIcon(main: string, type: "expense" | "income" = "expense"): string {
  const categories = getDefaultCategories(type);
  const found = categories.find((c) => c.main === main);
  return found?.icon ?? "📌";
}
