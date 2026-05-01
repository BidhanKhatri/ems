import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOTP from './pages/VerifyResetOTP';
import ResetPassword from './pages/ResetPassword';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import Profile from './pages/Profile';
import EmployeeNotifications from './pages/EmployeeNotifications';
import AdminDashboard from './pages/AdminDashboard';
import ActivityTracking from './pages/ActivityTracking';
import Approvals from './pages/Approvals';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import AdminScheduling from './pages/AdminScheduling';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-otp" element={<VerifyResetOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Employee Routes */}
        <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<EmployeeDashboard />} />
            <Route path="/attendance" element={<AttendanceHistory />} />
            <Route path="/notifications" element={<EmployeeNotifications />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/activity-tracking" element={<ActivityTracking />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/scheduling" element={<AdminScheduling />} />
            <Route path="/admin/groups" element={<Groups />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
