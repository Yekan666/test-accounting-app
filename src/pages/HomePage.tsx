import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  Radio,
  message,
  Space,
  Popconfirm,
  Divider,
} from "antd";
import {
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  addRecord,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  deleteCustomCategoryByMain,
  renameCustomCategory,
  renameCustomCategoryByMain,
} from "../db/database";
import {
  getDefaultCategories,
  mergeCategories,
  validateDuplicateCategory,
} from "../utils/categories";
import CategoryFormModal, {
  type CategoryFormMode,
  type CategoryFormInitial,
  type CategoryFormValues,
} from "../components/CategoryFormModal";
import type { CustomCategory, NewRecord } from "../types";

export default function HomePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recordType, setRecordType] = useState<"expense" | "income">("expense");
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [modalState, setModalState] = useState<{
    mode: CategoryFormMode;
    initial?: CategoryFormInitial;
  } | null>(null);
  // 下拉展开状态：打开分类弹窗前先收起下拉，避免弹窗关闭后误点选项
  const [mainSelectOpen, setMainSelectOpen] = useState(false);
  const [subSelectOpen, setSubSelectOpen] = useState(false);

  /** 加载当前类型（支出/收入）的自定义分类 */
  const loadCustomCategories = useCallback(async () => {
    try {
      const rows = await getCustomCategories(recordType);
      setCustomCategories(rows);
    } catch {
      setCustomCategories([]);
    }
  }, [recordType]);

  useEffect(() => {
    loadCustomCategories();
  }, [loadCustomCategories]);

  // 合并：自定义分类在前，预设分类在后
  const categories = mergeCategories(getDefaultCategories(recordType), customCategories);

  /** 自定义大类名集合（用于区分预设 / 自定义） */
  const customMainSet = useMemo(
    () => new Set(customCategories.map((r) => r.main_name)),
    [customCategories]
  );

  const mainOptions: { value: string; label: string; custom: boolean }[] = categories.map(
    (c) => ({
      value: c.main,
      label: `${c.icon} ${c.main}`,
      custom: customMainSet.has(c.main), // true → 下拉选项里显示管理按钮
    })
  );

  /** 当前选中的大类是否为自定义大类 */
  const selectedMainIsCustom = !!selectedMain && customMainSet.has(selectedMain);

  // 大类图标（预设小类没有自己的图标时，用所属大类的图标兜底）
  const selectedMainIcon = selectedMain
    ? categories.find((c) => c.main === selectedMain)?.icon
    : undefined;

  const subOptions: { value: string; label: string; custom: boolean }[] = selectedMain
    ? (categories.find((c) => c.main === selectedMain)?.subs ?? []).map((s) => {
        // 自定义小类 → 显示该小类自己存的图标；预设小类 → 显示所属大类图标
        const row = selectedMainIsCustom
          ? customCategories.find((r) => r.main_name === selectedMain && r.sub_name === s)
          : undefined;
        const icon = row?.icon || selectedMainIcon;
        return {
          value: s,
          label: `${icon ? `${icon} ` : ""}${s}`,
          custom: selectedMainIsCustom, // 自定义大类的所有小类都来自自定义行
        };
      })
    : [];

  const handleTypeChange = (type: "expense" | "income") => {
    setRecordType(type);
    setSelectedMain(null);
    setModalState(null); // 关闭分类弹窗，避免指向旧类型
    form.setFieldsValue({ category_main: undefined, category_sub: undefined });
  };

  const handleMainChange = (main: string) => {
    setSelectedMain(main);
    form.setFieldsValue({ category_sub: undefined });
  };

  /** 重名校验（包装共享函数，注入本页已加载的数据） */
  const validateDuplicate = (
    type: "expense" | "income",
    main: string,
    sub: string,
    excludeId?: number,
    excludeMain?: string
  ) => validateDuplicateCategory(type, main, sub, customCategories, excludeId, excludeMain);

  /** 收起两个下拉（打开弹窗前调用，避免弹窗关闭后误点选项） */
  const closeDropdowns = () => {
    setMainSelectOpen(false);
    setSubSelectOpen(false);
  };

  /** 打开"新建大类"弹窗（类型锁定为当前记录类型，小类可留空） */
  const openCreateMain = () => {
    closeDropdowns();
    setModalState({ mode: "create", initial: { type: recordType } });
  };

  /** 打开"新建小类"弹窗（大类锁定为当前选中的自定义大类，图标预填） */
  const openAddSub = () => {
    if (!selectedMain || !selectedMainIsCustom) return;
    closeDropdowns();
    const icon = customCategories.find((r) => r.main_name === selectedMain)?.icon;
    setModalState({ mode: "add-sub", initial: { type: recordType, main: selectedMain, icon } });
  };

  /** 打开"改名小类"弹窗（大类锁定不变） */
  const openRenameSub = (sub: string) => {
    const row = customCategories.find(
      (r) => r.main_name === selectedMain && r.sub_name === sub
    );
    if (!row || !selectedMain) return;
    closeDropdowns();
    setModalState({
      mode: "edit",
      initial: { type: recordType, main: selectedMain, sub, icon: row.icon, id: row.id },
    });
  };

  /** 打开"改名大类"弹窗（可同时换图标） */
  const openRenameMain = (main: string) => {
    closeDropdowns();
    const icon = customCategories.find((r) => r.main_name === main)?.icon;
    setModalState({ mode: "rename-main", initial: { type: recordType, main, icon } });
  };

  /** 保存回调：按模式分派数据库操作；改名后自动选中新名称（删除才清空） */
  const handleModalSave = async (values: CategoryFormValues) => {
    const mode = modalState?.mode;
    const initial = modalState?.initial;
    if (mode === "rename-main" && initial?.main) {
      await renameCustomCategoryByMain(initial.type, initial.main, values.main_name, values.icon);
      message.success("大类已更新");
    } else if (mode === "edit" && initial?.id) {
      await renameCustomCategory(initial.id, values.main_name, values.sub_name, values.icon);
      message.success("小类已更新");
    } else {
      await addCustomCategory(values.type, values.main_name, values.sub_name, values.icon);
      message.success(mode === "add-sub" ? "小类已添加" : "分类已添加");
    }
    setModalState(null);
    await loadCustomCategories(); // 刷新下拉数据

    // 修改后自动选中新名称（而不是清空）；删除才清空
    if (mode === "rename-main" && initial?.main) {
      const wasSelected = selectedMain === initial.main;
      setSelectedMain(values.main_name);
      form.setFieldsValue({ category_main: values.main_name });
      // 改的不是当前选中的大类时，之前选的小类属于别的分类，已失效 → 清掉
      if (!wasSelected) {
        form.setFieldsValue({ category_sub: undefined });
      }
    } else if (mode === "edit" && initial?.id) {
      form.setFieldsValue({ category_sub: values.sub_name });
    }
  };

  /** 删除整个大类（下拉里） */
  const handleDeleteMain = async (main: string) => {
    try {
      await deleteCustomCategoryByMain(recordType, main);
      message.success(`已删除「${main}」大类`);
      if (selectedMain === main) {
        setSelectedMain(null);
        form.setFieldsValue({ category_main: undefined, category_sub: undefined });
      }
      await loadCustomCategories();
    } catch (err) {
      message.error("删除失败：" + String(err));
    }
  };

  /** 删除一个小类（下拉里） */
  const handleDeleteSub = async (sub: string) => {
    const row = customCategories.find(
      (r) => r.main_name === selectedMain && r.sub_name === sub
    );
    if (!row) return;
    try {
      await deleteCustomCategory(row.id);
      message.success(`已删除「${sub}」`);
      if (form.getFieldValue("category_sub") === sub) {
        form.setFieldsValue({ category_sub: undefined });
      }
      await loadCustomCategories();
    } catch (err) {
      message.error("删除失败：" + String(err));
    }
  };

  const handleSubmit = async (values: {
    amount: number;
    category_main: string;
    category_sub: string;
    date: Dayjs;
    note?: string;
  }) => {
    setLoading(true);
    try {
      const record: NewRecord = {
        type: recordType,
        amount: values.amount,
        category_main: values.category_main,
        category_sub: values.category_sub,
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || "",
      };
      await addRecord(record);
      message.success("记账成功！");
      form.resetFields();
      setSelectedMain(null);
    } catch (err) {
      message.error("记账失败：" + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        style={{ maxWidth: 520, margin: "0 auto" }}
        title={
          <Space>
            {recordType === "expense" ? "📝" : "💰"}
            <span>记一笔</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ date: dayjs(), type: "expense" }}
        >
          {/* 类型切换 */}
          <Form.Item label="类型">
            <Radio.Group
              value={recordType}
              onChange={(e) => handleTypeChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="expense" style={{ color: recordType === "expense" ? "#ff4d4f" : undefined }}>
                支出
              </Radio.Button>
              <Radio.Button value="income" style={{ color: recordType === "income" ? "#52c41a" : undefined }}>
                收入
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* 金额 */}
          <Form.Item
            label="金额（元）"
            name="amount"
            rules={[{ required: true, message: "请输入金额" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              max={99999999.99}
              precision={2}
              placeholder="0.00"
              prefix="¥"
              size="large"
            />
          </Form.Item>

          {/* 一级分类 */}
          <Form.Item
            label="一级分类"
            name="category_main"
            rules={[{ required: true, message: "请选择分类" }]}
          >
            <Select
              options={mainOptions}
              placeholder="选择大类"
              onChange={handleMainChange}
              size="large"
              open={mainSelectOpen}
              onOpenChange={setMainSelectOpen}
              optionRender={(option) => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <span>{option.data.label}</span>
                  {option.data.custom && (
                    <span
                      // 关键：同时阻止 mousedown 和 click 冒泡，点按钮才不会选中该项、不会关下拉
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", gap: 4 }}
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openRenameMain(option.data.value)}
                      >
                        改名
                      </Button>
                      <Popconfirm
                        title={`删除「${option.data.value}」整个大类？`}
                        description="将删除其下所有小类。已有账单记录不会受影响。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteMain(option.data.value)}
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </span>
                  )}
                </div>
              )}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <Button type="text" block icon={<PlusOutlined />} onClick={openCreateMain}>
                    新建大类
                  </Button>
                </>
              )}
            />
          </Form.Item>

          {/* 二级分类 */}
          <Form.Item
            label="二级分类"
            name="category_sub"
            rules={[{ required: true, message: "请选择小类" }]}
          >
            <Select
              options={subOptions}
              placeholder={
                !selectedMain
                  ? "请先选择大类"
                  : selectedMainIsCustom && subOptions.length === 0
                    ? "还没有小类，点下方「新建小类」"
                    : "选择小类"
              }
              disabled={!selectedMain}
              size="large"
              open={subSelectOpen}
              onOpenChange={setSubSelectOpen}
              notFoundContent={
                selectedMainIsCustom && subOptions.length === 0
                  ? "还没有小类，点下方「新建小类」"
                  : undefined
              }
              optionRender={(option) => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <span>{option.data.label}</span>
                  {option.data.custom && (
                    <span
                      // 关键：同时阻止 mousedown 和 click 冒泡，点按钮才不会选中该项、不会关下拉
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", gap: 4 }}
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openRenameSub(option.data.value)}
                      >
                        改名
                      </Button>
                      <Popconfirm
                        title={`删除小类「${option.data.value}」？`}
                        description="已有账单记录不会受影响，但之后不能再选它记账。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteSub(option.data.value)}
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </span>
                  )}
                </div>
              )}
              // 仅当当前选中的是自定义大类时，才提供"新建小类"入口（预设大类不能加小类）
              popupRender={
                selectedMainIsCustom
                  ? (menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "4px 0" }} />
                        <Button type="text" block icon={<PlusOutlined />} onClick={openAddSub}>
                          新建小类
                        </Button>
                      </>
                    )
                  : undefined
              }
            />
          </Form.Item>

          {/* 日期 */}
          <Form.Item
            label="日期"
            name="date"
            rules={[{ required: true, message: "请选择日期" }]}
          >
            <DatePicker style={{ width: "100%" }} size="large" />
          </Form.Item>

          {/* 备注 */}
          <Form.Item label="备注" name="note">
            <Input.TextArea
              placeholder="写点什么..."
              rows={2}
              maxLength={200}
              showCount
            />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
              block
              size="large"
              style={{
                background: recordType === "expense" ? "#ff4d4f" : "#52c41a",
                borderColor: recordType === "expense" ? "#ff4d4f" : "#52c41a",
              }}
            >
              记一笔
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 共享的分类弹窗：新建大类（类型锁定、小类可留空）；其余模式按需锁定 */}
      <CategoryFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? "create"}
        initial={modalState?.initial}
        typeLocked={modalState?.mode === "create"}
        subRequired={modalState?.mode !== "create"}
        mainLocked={modalState?.mode === "edit"}
        validateDuplicate={validateDuplicate}
        onSave={handleModalSave}
        onCancel={() => setModalState(null)}
      />
    </>
  );
}
