import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const AuthLayout = () => {
  const { isAuthenticated, user } = useAuthStore();

  // If user already has a valid token, skip auth pages and go straight to their dashboard
  if (isAuthenticated && user) {
    const destination = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return (
    <div className='bg-gradient-to-br from-blue-100 to-blue-50 '>
      <Outlet />
    </div>
  );
};

export default AuthLayout;
