import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  role: 'admin' | 'educator' | 'student';
}

export default function ProtectedRoute({ role }: Props) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;

  return <Outlet />;
}
