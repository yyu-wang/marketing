import { useEffect, useState, useCallback } from 'react';
import { Button, Form, Input, Modal, message, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { LockOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getUserList, createUser, updateUser, deleteUser, resetUserPassword } from '@/api/user';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/user';
import { useAuthStore } from '@/stores/auth';
import { DEFAULT_PAGE_SIZE } from '@/constants';

export const UserListPage = () => {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchEmail, setSearchEmail] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: DEFAULT_PAGE_SIZE };
      if (searchEmail) params.email = searchEmail;
      const res = await getUserList(params);
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, searchEmail]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'user' });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({ nickname: user.nickname, role: user.role, isActive: user.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const payload: UpdateUserPayload = { nickname: values.nickname, role: values.role, isActive: values.isActive };
        await updateUser(editingUser.id, payload);
        message.success('更新成功');
      } else {
        const payload: CreateUserPayload = { email: values.email, password: values.password, nickname: values.nickname, role: values.role };
        await createUser(payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchList();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('删除成功');
      fetchList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      if (resetUserId === null) return;
      setResetLoading(true);
      await resetUserPassword(resetUserId, values.newPassword);
      message.success('密码重置成功');
      setResetModalOpen(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '重置失败';
      message.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '昵称', dataIndex: 'nickname', width: 140 },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色', dataIndex: 'role', width: 100,
      render: (role: string) => <Tag color={role === 'admin' ? 'gold' : 'blue'}>{role === 'admin' ? '管理员' : '普通用户'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'isActive', width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 280,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setResetUserId(record.id);
              resetForm.resetFields();
              setResetModalOpen(true);
            }}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定删除该用户？"
            description="此操作不可撤销"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger disabled={record.id === currentUser?.userId}>删除</Button>
          </Popconfirm>
        </Space>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增用户</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, pageSize: DEFAULT_PAGE_SIZE, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nickname" label="昵称" rules={[{ max: 20, message: '昵称最多20个字符' }]}>
            <Input maxLength={20} placeholder="请输入昵称" />
          </Form.Item>
          {!editingUser && (
            <>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={[{ label: '管理员', value: 'admin' }, { label: '普通用户', value: 'user' }]} />
          </Form.Item>
          {editingUser && (
            <Form.Item
              name="isActive"
              label="启用状态"
              getValueProps={(value: number) => ({ checked: value === 1 })}
              getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
            >
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={resetModalOpen}
        onOk={handleResetPassword}
        onCancel={() => setResetModalOpen(false)}
        confirmLoading={resetLoading}
        destroyOnHidden
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, min: 6, message: '密码至少6位' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
