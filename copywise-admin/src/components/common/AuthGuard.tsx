import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, isAdmin } = useAuthStore();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2>403 — 需要管理员权限</h2>
      </div>
    );
  }

  return <>{children}</>;
};
