import { useEffect, useState } from "react";
import { Form, Input, Select, Modal, message } from "antd";
import { CUSTOM_ICON_OPTIONS } from "../utils/categories";

/** 弹窗模式 */
export type CategoryFormMode =
  | "create" // 新增分类
  | "add-sub" // 向已有大类添加小类（类型 + 大类锁定）
  | "edit" // 编辑已有的一行
  | "rename-main"; // 只改大类名和图标

/** 打开弹窗时的预填信息 */
export interface CategoryFormInitial {
  type: "expense" | "income";
  main?: string; // add-sub / edit / rename-main 预填大类名
  sub?: string; // edit 预填小类名
  icon?: string; // 预填图标
  id?: number; // edit 时所在行的 id（校验时排除自己）
}

/** 保存回调的数据（rename-main 模式 sub_name 为空串，父组件忽略） */
export interface CategoryFormValues {
  id?: number;
  type: "expense" | "income";
  main_name: string;
  sub_name: string;
  icon: string;
}

interface CategoryFormModalProps {
  open: boolean;
  mode: CategoryFormMode;
  initial?: CategoryFormInitial;
  /** 重名校验由父组件传入（父组件持有自定义分类数据）；checkSub 为"改大类名时跳过小类重名检查"开关 */
  validateDuplicate: (
    type: "expense" | "income",
    main: string,
    sub: string,
    excludeId?: number,
    excludeMain?: string,
    checkSub?: boolean
  ) => Promise<void>;
  /** 保存：父组件负责数据库操作、刷新和关闭弹窗 */
  onSave: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
  /** 新增模式下类型是否锁定（记一笔页锁定为当前支出/收入） */
  typeLocked?: boolean;
  /** 新增模式下小类是否必填（记一笔页允许留空） */
  subRequired?: boolean;
  /** 编辑模式下大类是否锁定（记一笔页改小类时大类不变） */
  mainLocked?: boolean;
}

/** 图标选择格子（受控组件，供 Form.Item 使用）。选中的格子显示蓝色边框 + 浅蓝背景，持久高亮 */
function IconPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const selected = value || "";
  // 旧数据的图标可能不在候选列表里，把当前值放到最前面，保证选中项始终可见
  const options =
    selected && !CUSTOM_ICON_OPTIONS.includes(selected)
      ? [selected, ...CUSTOM_ICON_OPTIONS]
      : CUSTOM_ICON_OPTIONS;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((icon) => {
        const active = selected === icon;
        return (
          <div
            key={icon}
            onClick={() => onChange?.(icon)}
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              cursor: "pointer",
              borderRadius: 8,
              border: `1px solid ${active ? "#1677ff" : "#d9d9d9"}`,
              background: active ? "#e6f4ff" : "#ffffff",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
}

/** 共享的分类新增/编辑弹窗（分类管理页与记一笔页共用） */
export default function CategoryFormModal({
  open,
  mode,
  initial,
  validateDuplicate,
  onSave,
  onCancel,
  typeLocked = false,
  subRequired = true,
  mainLocked = false,
}: CategoryFormModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // 每次打开时把初始值填入表单
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        type: initial?.type ?? "expense",
        main_name: initial?.main ?? "",
        sub_name: initial?.sub ?? "",
        icon: initial?.icon || CUSTOM_ICON_OPTIONS[0],
      });
    }
  }, [open, form, initial]);

  /** 提交保存 */
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const type: "expense" | "income" = values.type;
      const main = (values.main_name as string).trim();
      const sub = mode === "rename-main" ? "" : ((values.sub_name as string) ?? "").trim();
      const icon = (values.icon as string) || CUSTOM_ICON_OPTIONS[0];
      // 小类留空时自动填成大类名（与收入预设"工资→工资"的模式一致）
      const finalSub = sub || main;

      // 重名校验（排除自己所在行 / 所在大类组；改大类名时不新增小类，跳过小类重名检查）
      await validateDuplicate(type, main, finalSub, initial?.id, initial?.main, mode !== "rename-main");

      setSaving(true);
      await onSave({ id: initial?.id, type, main_name: main, sub_name: finalSub, icon });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message) message.error(err.message);
      } else if (typeof err === "string") {
        // 数据库插件可能抛字符串错误，兜底提示，避免用户点了保存却没任何反馈
        message.error(err);
      }
      // 表单校验失败（antd 的校验错误对象）不提示
    } finally {
      setSaving(false);
    }
  };

  // 各模式下字段的锁定状态
  const typeDisabled = mode !== "create" || typeLocked;
  const mainDisabled = mode === "add-sub" || (mode === "edit" && mainLocked);
  const showSub = mode !== "rename-main";
  const subRequiredRule = mode !== "create" || subRequired;

  const titles: Record<CategoryFormMode, string> = {
    create: "新增分类",
    "add-sub": "添加小类",
    edit: "修改分类",
    "rename-main": "修改大类",
  };

  return (
    <Modal
      title={titles[mode]}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={mode === "create" ? "添加" : "保存"}
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ type: "expense" }}>
        <Form.Item
          label="类型"
          name="type"
          rules={[{ required: true, message: "请选择类型" }]}
        >
          <Select
            options={[
              { value: "expense", label: "支出" },
              { value: "income", label: "收入" },
            ]}
            disabled={typeDisabled}
          />
        </Form.Item>

        <Form.Item
          label="图标"
          name="icon"
          rules={[{ required: true, message: "请选择图标" }]}
        >
          <IconPicker />
        </Form.Item>

        <Form.Item
          label="一级分类（大类）"
          name="main_name"
          rules={[
            { required: true, message: "请输入大类名称" },
            { max: 20, message: "大类名称最多 20 个字" },
          ]}
        >
          <Input placeholder="例如：宠物" maxLength={20} disabled={mainDisabled} />
        </Form.Item>

        {showSub && (
          <Form.Item
            label="二级分类（小类）"
            name="sub_name"
            rules={
              subRequiredRule
                ? [
                    { required: true, message: "请输入小类名称" },
                    { max: 20, message: "小类名称最多 20 个字" },
                  ]
                : [{ max: 20, message: "小类名称最多 20 个字" }]
            }
          >
            <Input
              placeholder={subRequiredRule ? "例如：猫粮" : "可留空，留空时默认为大类名"}
              maxLength={20}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
