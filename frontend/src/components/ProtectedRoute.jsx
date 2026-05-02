import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to respective dashboard if unauthorized
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  // Handle employee approval status
  if (user.role === 'EMPLOYEE' && user.approvalStatus !== 'APPROVED') {
    return <Navigate to="/approval-status" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
