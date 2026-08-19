import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { UserListPage } from '@/pages/users/UserListPage';
import { TemplateListPage } from '@/pages/templates/TemplateListPage';
import { QuotaListPage } from '@/pages/quota/QuotaListPage';
import { AuthGuard } from '@/components/common/AuthGuard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AuthGuard><AdminLayout /></AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UserListPage /> },
      { path: 'templates', element: <TemplateListPage /> },
      { path: 'quota', element: <QuotaListPage /> },
    ],
  },
]);
