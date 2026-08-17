import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Space,
  Divider,
  Typography,
  message,
  Popconfirm,
  Tag,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  CUSTOM_CATEGORY_ICON,
  validateDuplicateCategory,
} from "../utils/categories";
import {
  getCustomCategories,
  addCustomCategory,
  renameCustomCategory,
  deleteCustomCategory,
  deleteCustomCategoryByMain,
} from "../db/database";
import CategoryFormModal, {
  type CategoryFormMode,
  type CategoryFormInitial,
  type CategoryFormValues,
} from "../components/CategoryFormModal";
import type { CustomCategory } from "../types";

/** 自定义分类按大类分组后的结构 */
interface CustomGroup {
  type: "expense" | "income";
  main: string;
  items: CustomCategory[];
}

export default function CategoriesPage() {
  const [customRows, setCustomRows] = useState<CustomCategory[]>([]);
  const [modalState, setModalState] = useState<{
    mode: CategoryFormMode;
    initial?: CategoryFormInitial;
  } | null>(null);

  /** 加载全部自定义分类（支出 + 收入） */
  const loadCustomCategories = async () => {
    const [expense, income] = await Promise.all([
      getCustomCategories("expense"),
      getCustomCategories("income"),
    ]);
    setCustomRows([...expense, ...income]);
  };

  useEffect(() => {
    loadCustomCategories().catch((err) =>
      message.error("加载自定义分类失败：" + String(err))
    );
  }, []);

  /** 按大类分组的自定义分类 */
  const groups = useMemo(() => {
    const map = new Map<string, CustomGroup>();
    for (const row of customRows) {
      const key = `${row.type}|${row.main_name}`;
      let group = map.get(key);
      if (!group) {
        group = { type: row.type, main: row.main_name, items: [] };
        map.set(key, group);
      }
      group.items.push(row);
    }
    return [...map.values()];
  }, [customRows]);

  /** 重名校验（包装共享函数，注入本页已加载的数据） */
  const validateDuplicate = (
    type: "expense" | "income",
    main: string,
    sub: string,
    excludeId?: number,
    excludeMain?: string
  ) => validateDuplicateCategory(type, main, sub, customRows, excludeId, excludeMain);

  /** 打开"新增分类"弹窗 */
  const openAdd = () => setModalState({ mode: "create", initial: { type: "expense" } });

  /** 打开"编辑某行"弹窗 */
  const openEdit = (row: CustomCategory) =>
    setModalState({
      mode: "edit",
      initial: {
        type: row.type,
        main: row.main_name,
        sub: row.sub_name,
        icon: row.icon,
        id: row.id,
      },
    });

  /** 打开"给已有大类添加小类"弹窗（类型和大类名已锁定预填） */
  const openAddSub = (group: CustomGroup) =>
    setModalState({
      mode: "add-sub",
      initial: { type: group.type, main: group.main, icon: group.items[0]?.icon },
    });

  /** 保存回调：按模式分派数据库操作 */
  const handleModalSave = async (values: CategoryFormValues) => {
    if (modalState?.mode === "edit") {
      await renameCustomCategory(values.id!, values.main_name, values.sub_name, values.icon);
      message.success("分类已更新");
    } else {
      await addCustomCategory(values.type, values.main_name, values.sub_name, values.icon);
      message.success(modalState?.mode === "add-sub" ? "小类已添加" : "分类已添加");
    }
    setModalState(null);
    await loadCustomCategories();
  };

  /** 删除一个小类 */
  const handleDeleteSub = async (row: CustomCategory) => {
    try {
      await deleteCustomCategory(row.id);
      message.success("已删除");
      await loadCustomCategories();
    } catch (err) {
      message.error("删除失败：" + String(err));
    }
  };

  /** 删除整个大类（连同其下所有小类） */
  const handleDeleteGroup = async (group: CustomGroup) => {
    try {
      await deleteCustomCategoryByMain(group.type, group.main);
      message.success(`已删除「${group.main}」大类`);
      await loadCustomCategories();
    } catch (err) {
      message.error("删除失败：" + String(err));
    }
  };

  return (
    <Space orientation="vertical" style={{ width: "100%", maxWidth: 640 }} size="large">
      {/* 我的分类（可增删改） */}
      <Card
        title="我的分类"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增分类
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          这里管理你自己创建的分类，可以新增、改名、删除。系统预设分类不可修改。
          删除分类不会影响已有的账单记录，但该分类之后不能再用于记账。
        </Typography.Paragraph>

        {groups.length === 0 ? (
          <Empty description="还没有自定义分类，点击右上角「新增分类」创建一个吧" />
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }} size="small">
            {groups.map((group) => (
              <Card
                key={`${group.type}|${group.main}`}
                size="small"
                style={{ background: "#fafafa" }}
                title={
                  <Space>
                    <span>{group.items[0].icon || CUSTOM_CATEGORY_ICON}</span>
                    <span>{group.main}</span>
                    <Tag color={group.type === "expense" ? "red" : "green"}>
                      {group.type === "expense" ? "支出" : "收入"}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => openAddSub(group)}
                    >
                      添加小类
                    </Button>
                    <Popconfirm
                      title={`删除「${group.main}」整个大类？`}
                      description={`将删除其下所有小类（${group.items
                        .map((i) => i.sub_name)
                        .join("、")}）。已有账单记录不会受影响。`}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteGroup(group)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        删除大类
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <Space orientation="vertical" style={{ width: "100%" }} size="small">
                  {group.items.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{row.sub_name}</span>
                      <Space size={4}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEdit(row)}
                        >
                          改名
                        </Button>
                        <Popconfirm
                          title={`删除小类「${row.sub_name}」？`}
                          description="已有账单记录不会受影响，但之后不能再选它记账。"
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDeleteSub(row)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      {/* 系统预设分类 — 只读 */}
      <Card title="系统预设分类">
        <Typography.Paragraph type="secondary">
          以下为系统自带的分类，只读不可修改。
        </Typography.Paragraph>

        <Typography.Title level={5}>支出分类</Typography.Title>
        {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
          <div key={cat.main} style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {cat.icon} {cat.main}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {cat.subs.join(" · ")}
            </Typography.Text>
          </div>
        ))}

        <Divider />

        <Typography.Title level={5}>收入分类</Typography.Title>
        {DEFAULT_INCOME_CATEGORIES.map((cat) => (
          <div key={cat.main} style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {cat.icon} {cat.main}
            </Typography.Text>
          </div>
        ))}
      </Card>

      {/* 共享的新增 / 编辑分类弹窗 */}
      <CategoryFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? "create"}
        initial={modalState?.initial}
        validateDuplicate={validateDuplicate}
        onSave={handleModalSave}
        onCancel={() => setModalState(null)}
      />
    </Space>
  );
}
