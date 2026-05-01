import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className='bg-gradient-to-br from-blue-100 to-blue-50 '>
      <Outlet />
    </div>
  );
};

export default AuthLayout;
