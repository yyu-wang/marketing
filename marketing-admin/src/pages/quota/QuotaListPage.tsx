import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, message, Space, Table, Tag } from 'antd';
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getQuotaList, setUserQuota } from '@/api/quota';
import type { QuotaOverview } from '@/types/quota';
import { DEFAULT_PAGE_SIZE } from '@/constants';

const MAX_DAILY_QUOTA = 1000;

export const QuotaListPage = () => {
  const [data, setData] = useState<QuotaOverview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchEmail, setSearchEmail] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<QuotaOverview | null>(null);
  const [form] = Form.useForm();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: DEFAULT_PAGE_SIZE };
      if (searchEmail) params.email = searchEmail;
      const res = await getQuotaList(params);
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      /* 拦截器已统一显示后端错误消息 */
    } finally {
      setLoading(false);
    }
  }, [page, searchEmail]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSetLimit = (user: QuotaOverview) => {
    setEditingUser(user);
    form.setFieldsValue({ dailyQuota: user.dailyLimit });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingUser) return;
    try {
      const values = await form.validateFields();
      await setUserQuota(editingUser.id, { dailyQuota: values.dailyQuota });
      message.success('限额已更新');
      setModalOpen(false);
      fetchList();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      /* 拦截器已统一显示后端错误消息 */
    }
  };

  const columns: ColumnsType<QuotaOverview> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '邮箱', dataIndex: 'email' },
    { title: '昵称', dataIndex: 'nickname', width: 140 },
    {
      title: '今日已用', dataIndex: 'todayUsed', width: 100,
      render: (v: number, record) =>
        v >= record.dailyLimit
          ? <Tag color="red">{v}</Tag>
          : <span>{v}</span>,
    },
    {
      title: '每日限额', dataIndex: 'dailyLimit', width: 100,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_, record) => (
        <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => handleSetLimit(record)}>
          设置限额
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索邮箱"
          prefix={<SearchOutlined />}
          value={searchEmail}
          onChange={(e) => { setSearchEmail(e.target.value); setPage(1); }}
          allowClear
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, pageSize: DEFAULT_PAGE_SIZE, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingUser ? `设置限额 - ${editingUser.email}` : '设置限额'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="dailyQuota"
            label="每日生成次数上限"
            rules={[{ required: true, message: '请输入每日限额' }]}
          >
            <InputNumber
              min={1}
              max={MAX_DAILY_QUOTA}
              style={{ width: '100%' }}
              placeholder="请输入每日限额"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
