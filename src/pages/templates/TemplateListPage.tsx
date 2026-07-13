import { useEffect, useState, useCallback } from 'react';
import { Button, Form, Input, Modal, message, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getTemplateList, createTemplate, updateTemplate, deleteTemplate } from '@/api/template';
import type { PromptTemplate, CreateTemplatePayload, UpdateTemplatePayload } from '@/types/template';
import { DEFAULT_PAGE_SIZE } from '@/constants';

const CHANNEL_OPTIONS = [
  { label: '小红书', value: 'xiaohongshu' },
  { label: '朋友圈', value: 'moments' },
  { label: '广告语', value: 'ad_slogan' },
];

const CHANNEL_MAP: Record<string, string> = {
  xiaohongshu: '小红书',
  moments: '朋友圈',
  ad_slogan: '广告语',
};

export const TemplateListPage = () => {
  const [data, setData] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [filterChannel, setFilterChannel] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PromptTemplate | null>(null);
  const [form] = Form.useForm();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: DEFAULT_PAGE_SIZE };
      if (searchName) params.name = searchName;
      if (filterChannel) params.channel = filterChannel;
      const res = await getTemplateList(params);
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      message.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, searchName, filterChannel]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: PromptTemplate) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        const payload: UpdateTemplatePayload = values;
        await updateTemplate(editingRecord.id, payload);
        message.success('更新成功');
      } else {
        const payload: CreateTemplatePayload = values;
        await createTemplate(payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchList();
    } catch {
      /* validation error handled by form */
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate(id);
      message.success('删除成功');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<PromptTemplate> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', width: 200 },
    {
      title: '渠道', dataIndex: 'channel', width: 100,
      render: (v: string) => <Tag>{CHANNEL_MAP[v] || v}</Tag>,
    },
    {
      title: '内容', dataIndex: 'content', ellipsis: true,
      render: (v: string) => v.length > 100 ? `${v.slice(0, 100)}...` : v,
    },
    {
      title: '更新时间', dataIndex: 'updatedAt', width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定删除该模板？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索模板名称"
          prefix={<SearchOutlined />}
          value={searchName}
          onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
          allowClear
        />
        <Select
          placeholder="渠道筛选"
          value={filterChannel}
          onChange={(v) => { setFilterChannel(v); setPage(1); }}
          allowClear
          style={{ width: 140 }}
          options={CHANNEL_OPTIONS}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增模板</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, pageSize: DEFAULT_PAGE_SIZE, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingRecord ? '编辑模板' : '新增模板'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="channel" label="渠道" rules={[{ required: true, message: '请选择渠道' }]}>
            <Select options={CHANNEL_OPTIONS} />
          </Form.Item>
          <Form.Item name="content" label="模板内容" rules={[{ required: true, message: '请输入模板内容' }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
