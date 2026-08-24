import type { Category, CustomCategory } from "../types";

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

/** 自定义分类默认图标（旧数据兼容） */
export const CUSTOM_CATEGORY_ICON = "📌";

/** 自定义分类可选的内置表情图标列表 */
export const CUSTOM_ICON_OPTIONS = [
  "🐱", "🐶", "🐰", "🐼", "🦊", "🐸", "🐷", "🐢",
  "🍎", "🍔", "🍜", "☕", "🍰", "🍣", "🍉", "🍺",
  "🏠", "🚗", "✈️", "🏀", "⚽", "🎮", "🎬", "🎸",
  "💄", "👗", "💍", "📚", "💻", "📱", "🌿", "💊",
];

/**
 * 合并预设分类与用户自定义分类，生成完整分类清单。
 * 自定义分类条目（main_name + sub_name）按大类分组，排在最前面。
 */
export function mergeCategories(
  defaults: Category[],
  customRows: CustomCategory[]
): Category[] {
  const custom: Category[] = [];
  const map = new Map<string, Category>();

  for (const row of customRows) {
    let cat = map.get(row.main_name);
    if (!cat) {
      cat = { main: row.main_name, icon: row.icon || CUSTOM_CATEGORY_ICON, subs: [] };
      map.set(row.main_name, cat);
      custom.push(cat);
    }
    cat.subs.push(row.sub_name);
  }

  // 自定义分类在前，预设分类在后
  return [...custom, ...defaults];
}

/**
 * 重名校验（分类管理页与记一笔页共用）：
 * 1. 大类不能与预设大类重名
 * 2. 大类不能与其他自定义大类重名
 * 3. 小类不能与预设小类重名
 * 4. 自定义分类中同大类下小类不能重复
 * @param customRows  当前已加载的自定义分类行
 * @param excludeId   编辑某一行时排除自己（行级）
 * @param excludeMain 添加小类 / 改大类名时排除自己所在的大类组（组级）
 * @param checkSub    是否检查小类重名（改大类名时不新增小类，应跳过；默认检查）
 */
export async function validateDuplicateCategory(
  type: "expense" | "income",
  main: string,
  sub: string,
  customRows: CustomCategory[],
  excludeId?: number,
  excludeMain?: string,
  checkSub = true
): Promise<void> {
  const defaults = type === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  // 1. 大类与预设大类重名 → 不允许
  if (defaults.some((c) => c.main === main)) {
    throw new Error("该大类与系统预设分类同名，请换一个名字");
  }

  // 2. 大类与其他自定义大类重名 → 不允许（排除自己所在的大类组）
  if (
    customRows.some(
      (r) => r.type === type && r.main_name === main && r.main_name !== excludeMain
    )
  ) {
    throw new Error(`自定义分类中已有「${main}」大类，请换一个名字`);
  }

  // 3. 小类与预设小类重名 → 不允许（仅针对预设大类；自定义大类名已被规则 1 挡住，属防御性分支）
  if (checkSub) {
    const presetCat = defaults.find((c) => c.main === main);
    if (presetCat?.subs.includes(sub)) {
      throw new Error(`系统预设分类中已有「${sub}」，请换一个名字`);
    }

    // 4. 自定义分类中同大类同小类重复 → 不允许（排除自己的行）
    const dup = customRows.some(
      (r) =>
        r.id !== excludeId &&
        r.type === type &&
        r.main_name === main &&
        r.sub_name === sub
    );
    if (dup) {
      throw new Error(`「${main}」下已有「${sub}」，请换一个名字`);
    }
  }
}
