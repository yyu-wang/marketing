import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { sha256 } from '@/utils/crypto';

const { Title } = Typography;

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const hashedPassword = await sha256(values.password);
      const res = await loginApi({ email: values.email, password: hashedPassword, hashVersion: 1 });
      const { token, userId, email, role } = res.data.data;

      if (role !== 'admin') {
        message.error('该账户无管理员权限');
        setLoading(false);
        return;
      }

      login({ userId, email, role }, token);
      message.success('登录成功');
      navigate('/users', { replace: true });
    } catch {
      /* 拦截器已统一显示后端错误消息 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>CopyWise 管理后台</Title>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<UserOutlined />} placeholder="管理员邮箱" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
