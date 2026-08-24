import { describe, it, expect } from "vitest";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  CUSTOM_ICON_OPTIONS,
  getDefaultCategories,
  getCategoryIcon,
  mergeCategories,
  validateDuplicateCategory,
} from "./categories";
import type { CustomCategory } from "../types";

/** 构造一条自定义分类测试数据 */
function makeCustomRow(overrides: Partial<CustomCategory>): CustomCategory {
  return {
    id: 1,
    type: "expense",
    main_name: "宠物",
    sub_name: "猫粮",
    icon: "🐱",
    created_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

describe("预设分类数据", () => {
  it("支出分类包含 10 个预设大类", () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(10);
    expect(DEFAULT_EXPENSE_CATEGORIES[0].main).toBe("餐饮");
  });

  it("收入分类包含 5 个预设大类", () => {
    expect(DEFAULT_INCOME_CATEGORIES).toHaveLength(5);
    expect(DEFAULT_INCOME_CATEGORIES[0].main).toBe("工资");
  });

  it("内置可选图标列表共 32 个", () => {
    expect(CUSTOM_ICON_OPTIONS).toHaveLength(32);
  });

  it("getDefaultCategories 按类型返回对应分类", () => {
    expect(getDefaultCategories("expense")).toBe(DEFAULT_EXPENSE_CATEGORIES);
    expect(getDefaultCategories("income")).toBe(DEFAULT_INCOME_CATEGORIES);
  });
});

describe("getCategoryIcon", () => {
  it("已知大类返回对应图标", () => {
    expect(getCategoryIcon("餐饮")).toBe("🍽️");
    expect(getCategoryIcon("工资", "income")).toBe("💰");
  });

  it("未知大类返回默认图标 📌", () => {
    expect(getCategoryIcon("不存在的分类")).toBe("📌");
  });
});

describe("mergeCategories 合并分类", () => {
  it("没有自定义分类时，只返回系统预设分类", () => {
    const result = mergeCategories(DEFAULT_EXPENSE_CATEGORIES, []);
    expect(result).toHaveLength(10);
    expect(result.map((c) => c.main)).toEqual(
      DEFAULT_EXPENSE_CATEGORIES.map((c) => c.main)
    );
  });

  it("有自定义分类时，自定义分类排在最前面", () => {
    const custom = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮", icon: "🐱" }),
    ];
    const result = mergeCategories(DEFAULT_EXPENSE_CATEGORIES, custom);
    expect(result[0].main).toBe("宠物");
    expect(result).toHaveLength(11);
  });

  it("同一个大类的多个小类合并成一组", () => {
    const custom = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮", icon: "🐱" }),
      makeCustomRow({ id: 2, main_name: "宠物", sub_name: "狗粮", icon: "🐶" }),
      makeCustomRow({ id: 3, main_name: "宠物", sub_name: "宠物玩具", icon: "🦴" }),
    ];
    const result = mergeCategories(DEFAULT_EXPENSE_CATEGORIES, custom);
    const pet = result.find((c) => c.main === "宠物")!;
    expect(pet.subs).toEqual(["猫粮", "狗粮", "宠物玩具"]);
  });

  it("自定义大类的图标取该组第一行的图标", () => {
    const custom = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮", icon: "🐱" }),
      makeCustomRow({ id: 2, main_name: "宠物", sub_name: "狗粮", icon: "🐶" }),
    ];
    const result = mergeCategories(DEFAULT_EXPENSE_CATEGORIES, custom);
    expect(result[0].icon).toBe("🐱");
  });

  it("自定义分类行没有图标时，回退使用默认图标 📌", () => {
    const custom = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮", icon: "" }),
    ];
    const result = mergeCategories(DEFAULT_EXPENSE_CATEGORIES, custom);
    expect(result[0].icon).toBe("📌");
  });

  it("收入类型自定义分类也能正确合并", () => {
    const custom = [
      makeCustomRow({ type: "income", main_name: "副业", sub_name: "副业", icon: "💼" }),
    ];
    const result = mergeCategories(DEFAULT_INCOME_CATEGORIES, custom);
    expect(result).toHaveLength(6);
    expect(result[0].main).toBe("副业");
    expect(result[0].subs).toEqual(["副业"]);
  });
});

describe("validateDuplicateCategory 重名校验", () => {
  it("大类与预设大类重名时抛错", async () => {
    await expect(
      validateDuplicateCategory("expense", "餐饮", "宠物猫粮", [])
    ).rejects.toThrow("与系统预设分类同名");
  });

  it("大类与其他自定义大类重名时抛错", async () => {
    const rows = [makeCustomRow({ main_name: "宠物", sub_name: "猫粮" })];
    await expect(
      validateDuplicateCategory("expense", "宠物", "狗粮", rows)
    ).rejects.toThrow("已有「宠物」大类");
  });

  it("改大类名/只换图标时跳过小类重名检查（不抛错）", async () => {
    // 真实场景：给 [宠物/宠物]（小类留空=大类名）只换图标、名字不变，不应误报小类重复
    const rows = [makeCustomRow({ main_name: "宠物", sub_name: "宠物" })];
    await expect(
      validateDuplicateCategory("expense", "宠物", "宠物", rows, undefined, "宠物", false)
    ).resolves.toBeUndefined();
  });

  it("自定义大类下的小类名与预设小类同名时不报错（预设小类检查仅针对预设大类）", async () => {
    // 规则 3 是防御性分支：自定义大类名不可能与预设大类同名（规则 1 已拦），因此不会命中
    await expect(
      validateDuplicateCategory("expense", "宠物", "午餐", [])
    ).resolves.toBeUndefined();
  });

  it("添加小类时，与组内已有小类同名则抛错", async () => {
    const rows = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮" }),
      makeCustomRow({ id: 2, main_name: "宠物", sub_name: "狗粮" }),
    ];
    // add-sub 场景：向 [宠物] 组添加"狗粮"，excludeMain 排除组本身的大类重复检查
    await expect(
      validateDuplicateCategory("expense", "宠物", "狗粮", rows, undefined, "宠物")
    ).rejects.toThrow("已有「狗粮」");
  });

  it("编辑时排除自己所在行与组（同名不抛错）", async () => {
    const rows = [makeCustomRow({ main_name: "宠物", sub_name: "猫粮" })];
    // edit 场景：改"猫粮"的名字时，大类名不变，传入自己的 id 和所在组名
    await expect(
      validateDuplicateCategory("expense", "宠物", "猫粮", rows, 1, "宠物")
    ).resolves.toBeUndefined();
  });

  it("完全合法的分类名通过校验", async () => {
    const rows = [makeCustomRow({ main_name: "宠物", sub_name: "猫粮" })];
    await expect(
      validateDuplicateCategory("expense", "植物", "多肉", rows)
    ).resolves.toBeUndefined();
  });

  it("收入类型大类与预设收入分类重名时抛错", async () => {
    await expect(
      validateDuplicateCategory("income", "工资", "工资", [])
    ).rejects.toThrow("与系统预设分类同名");
  });

  it("checkSub=false 时跳过组内小类重复检查（改大类名场景）", async () => {
    const rows = [
      makeCustomRow({ main_name: "宠物", sub_name: "猫粮" }),
      makeCustomRow({ id: 2, main_name: "宠物", sub_name: "猫粮" }),
    ];
    // 改大类名时不检查小类，即使组内已有同名小类也应通过
    await expect(
      validateDuplicateCategory("expense", "宠物", "猫粮", rows, undefined, "宠物", false)
    ).resolves.toBeUndefined();
  });
});
