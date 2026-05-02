import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import { LogOut, Home, Users, CheckSquare, Shield, Settings, ChevronLeft, ChevronRight, UserCircle2, BellRing, Menu, X, Calendar, ClipboardList, Clock, ChevronDown } from 'lucide-react';
import api from '../services/api';

const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCheckins, setPendingCheckins] = useState(0);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);

  // Poll for pending approvals every 30s (admin only)
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    const fetchPending = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setPendingCount(data.pendingApprovals ?? 0);
        setPendingCheckins(data.pendingCheckins ?? 0);
        setPendingAccounts(data.pendingAccounts ?? 0);
      } catch {
        // silently ignore
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch unread notifications count for employees
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get('/activity/notifications/unread-count');
        setUnreadCount(data.count ?? 0);
      } catch {
        // silently ignore
      }
    };

    fetchUnreadCount();

    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('notificationUpdate', handleRefresh);
    return () => window.removeEventListener('notificationUpdate', handleRefresh);
  }, [user]);

  // Auto-close Approvals menu when navigating away from it
  useEffect(() => {
    if (!location.pathname.startsWith('/admin/approvals')) {
      setIsApprovalsOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinks = () => {
    if (user?.role === 'ADMIN') {
      return [
        { name: 'Dashboard', path: '/admin', icon: <Home className="w-[18px] h-[18px] flex-shrink-0" /> },
        { name: 'Employees', path: '/admin/employees', icon: <UserCircle2 className="w-[18px] h-[18px] flex-shrink-0" /> },
        { name: 'Attendance', path: '/admin/attendance', icon: <ClipboardList className="w-[18px] h-[18px] flex-shrink-0" /> },
        { name: 'Scheduling', path: '/admin/scheduling', icon: <Calendar className="w-[18px] h-[18px] flex-shrink-0" /> },
        {
          name: 'Approvals',
          path: '/admin/approvals',
          icon: <CheckSquare className="w-[18px] h-[18px] flex-shrink-0" />,
          badge: pendingCount,
          hasSubmenu: true,
          subItems: [
            { name: 'Check-in Approvals', path: '/admin/approvals', icon: <Clock className="w-[14px] h-[14px]" />, badge: pendingCheckins },
            { name: 'Account Approvals', path: '/admin/approvals?tab=accounts', icon: <UserCircle2 className="w-[14px] h-[14px]" />, badge: pendingAccounts },
          ]
        },
        { name: 'Groups', path: '/admin/groups', icon: <Users className="w-[18px] h-[18px] flex-shrink-0" /> },
        { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-[18px] h-[18px] flex-shrink-0" /> },
      ];
    }
    return [
      { name: 'Dashboard', path: '/dashboard', icon: <Home className="w-[18px] h-[18px] flex-shrink-0" /> },
      { name: 'Attendance', path: '/attendance', icon: <ClipboardList className="w-[18px] h-[18px] flex-shrink-0" /> },
      { name: 'Work Schedule', path: '/schedule', icon: <Calendar className="w-[18px] h-[18px] flex-shrink-0" /> },
      { name: 'Notifications', path: '/notifications', icon: <BellRing className="w-[18px] h-[18px] flex-shrink-0" />, badge: unreadCount },
      { name: 'Profile', path: '/profile', icon: <UserCircle2 className="w-[18px] h-[18px] flex-shrink-0" /> },
    ];
  };

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-60';
  const isAdmin = user?.role === 'ADMIN';

  // Theme object for consistent styling across both portals
  const theme = {
    mainBg: 'bg-[#f6f7fb]',
    sidebarBg: 'bg-white border-gray-100 shadow-[2px_0_16px_0_rgba(80,80,120,0.06)]',
    logoContainer: 'bg-indigo-600 shadow-indigo-200',
    logoIcon: 'text-white',
    portalTitle: 'text-gray-900',
    portalSubtitle: 'text-indigo-500',
    toggleBtnInfo: 'bg-white border-gray-200',
    toggleIcon: 'text-indigo-500',
    navItemActive: 'bg-indigo-50 text-indigo-700',
    navItemInactive: 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
    navIconActive: 'text-indigo-600',
    navIconInactive: 'text-gray-400 group-hover:text-gray-600',
    userWrapperBorder: 'border-gray-100',
    userCardBg: 'bg-gray-50',
    userAvatarWrapper: 'bg-indigo-100',
    userAvatarText: 'text-indigo-600',
    userName: 'text-gray-800',
    userRoleLabel: 'text-indigo-500',
    logoutBtnHover: 'text-gray-400 hover:text-red-600 hover:bg-red-50',
    headerAreaBg: 'bg-white/80 border-gray-100 shadow-[0_1px_8px_0_rgba(80,80,120,0.06)]',
    headerIcon: 'text-indigo-600',
    headerTitleText: 'text-gray-900',
    headerUserPill: 'bg-gray-50 border-gray-100',
    headerUserAvatarPillBg: 'bg-indigo-100',
    headerUserAvatarPillText: 'text-indigo-600',
    headerUserNameText: 'text-gray-700',
    headerUserRoleText: 'text-indigo-400',
    tooltipBg: '#1a1a2e',
    tooltipColor: '#e2e8f0',
    activeBarGradient: 'linear-gradient(to bottom, #6366f1, #818cf8)',
    toggleBtnHoverBg: '#ede9fe',
    toggleBtnHoverShadow: '#ede9fe44',
  };

  return (
    <>
      <style>{`
        .nav-tooltip {
          position: fixed;
          left: 68px;
          background: ${theme.tooltipBg};
          color: ${theme.tooltipColor};
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 5px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.14);
          transform: translateY(-50%);
        }
        .nav-tooltip::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: ${theme.tooltipBg};
        }
        .nav-item:hover .nav-tooltip {
          opacity: 1;
        }
        .active-bar {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          border-radius: 0 3px 3px 0;
          background: ${theme.activeBarGradient};
        }
        .sidebar-transition {
          transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .label-transition {
          transition: opacity 0.15s ease, width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          white-space: nowrap;
        }
        .toggle-btn {
          transition: background 0.15s, box-shadow 0.15s;
        }
        .toggle-btn:hover {
          background: ${theme.toggleBtnHoverBg};
          box-shadow: 0 0 0 4px ${theme.toggleBtnHoverShadow};
        }
        .mobile-sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s;
        }
        .mobile-sidebar-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        .mobile-sidebar-panel {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          width: 85%;
          max-width: 320px;
          background: ${theme.sidebarBg.split(' ')[0]};
          z-index: 101;
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 20px 0 50px rgba(0,0,0,0.15);
          border: none;
          border-radius: 0;
        }
        .mobile-sidebar-panel.active {
          transform: translateX(0);
        }
      `}</style>

      <div className={`min-h-screen ${theme.mainBg} flex flex-row`}>
        {/* Sidebar */}
        <aside
          className={`hidden sm:flex flex-col fixed inset-y-0 left-0 z-30 border-r sidebar-transition ${theme.sidebarBg} ${sidebarWidth}`}
          style={{ overflow: 'visible' }}
        >
          {/* Logo / Brand */}
          <div className={`flex items-center px-3 py-5 border-b relative ${isAdmin ? 'border-gray-100' : 'border-stone-100'}`} style={{ minHeight: 68 }}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${theme.logoContainer}`}>
              <Shield className={`w-4 h-4 ${theme.logoIcon}`} />
            </div>
            <div className={`label-transition ml-3 ${collapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto'}`}>
              <p className={`text-[13px] font-bold tracking-tight leading-tight ${theme.portalTitle}`}>
                {isAdmin ? 'Admin Portal' : 'Employee Portal'}
              </p>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mt-0.5 ${theme.portalSubtitle}`}>EMS</p>
            </div>

            {/* Toggle button */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={`toggle-btn absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 border rounded-full flex items-center justify-center shadow-sm z-10 ${theme.toggleBtnInfo}`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <ChevronRight className={`w-3 h-3 ${theme.toggleIcon}`} />
                : <ChevronLeft className={`w-3 h-3 ${theme.toggleIcon}`} />
              }
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-4 px-2 space-y-0.5" style={{ overflow: 'visible' }}>
            {getLinks().map((item) => {
              const isApprovalsPath = location.pathname.startsWith('/admin/approvals');
              const active = item.hasSubmenu ? isApprovalsPath : location.pathname === item.path;
              const hasSubmenu = item.hasSubmenu;
              const isOpen = isApprovalsOpen;

              if (hasSubmenu) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => !collapsed && setIsApprovalsOpen(!isOpen)}
                      className={`nav-item group relative flex items-center rounded-lg px-2 py-2.5 text-[13px] font-medium transition-colors duration-150 w-full ${active
                        ? theme.navItemActive
                        : theme.navItemInactive
                        }`}
                      style={{ justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'visible' }}
                    >
                      <span className={`flex-shrink-0 transition-colors ${active ? theme.navIconActive : theme.navIconInactive}`}>
                        {item.icon}
                      </span>
                      <span className={`label-transition ml-3 flex-1 flex items-center justify-between ${collapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
                        {item.name}
                        <div className="flex items-center gap-1.5">
                          {item.badge > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-extrabold shadow-sm">
                              {item.badge}
                            </span>
                          )}
                          {!collapsed && <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
                        </div>
                      </span>
                      {collapsed && item.badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                      )}
                      {collapsed && (
                        <span className="nav-tooltip">{item.name}</span>
                      )}
                    </button>

                    {isOpen && !collapsed && (
                      <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                        <div className="h-px bg-gray-50 mb-2 w-full" />
                        {item.subItems.map((sub) => {
                          const subActive = location.pathname === sub.path.split('?')[0] && (sub.path.includes('?') ? location.search.includes(sub.path.split('?')[1]) : !location.search);
                          return (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[11.5px] font-bold transition-all ${subActive
                                ? 'text-indigo-600 bg-indigo-50/50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {sub.icon}
                                {sub.name}
                              </div>
                              {sub.badge > 0 && (
                                <span className="min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[8px] font-black shadow-sm">
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`nav-item group relative flex items-center rounded-lg px-2 py-2.5 text-[13px] font-medium transition-colors duration-150 ${active
                    ? theme.navItemActive
                    : theme.navItemInactive
                    }`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'visible' }}
                >
                  {/* Active left bar */}
                  {active && <span className="active-bar" />}

                  {/* Icon */}
                  <span className={`flex-shrink-0 transition-colors ${active ? theme.navIconActive : theme.navIconInactive}`}>
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span className={`label-transition ml-3 flex-1 flex items-center justify-between ${collapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
                    {item.name}
                    {item.badge > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-extrabold shadow-sm animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </span>

                  {/* Collapsed badge dot */}
                  {collapsed && item.badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-sm animate-pulse" />
                  )}

                  {/* Tooltip (collapsed only) */}
                  {collapsed && (
                    <span className="nav-tooltip">
                      {item.name}
                      {item.badge > 0 && ` (${item.badge})`}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User + Logout */}
          <div className={`border-t p-3 flex flex-col gap-2 ${theme.userWrapperBorder}`} style={{ overflow: 'visible' }}>
            {!collapsed && (
              <div className={`px-2 py-2 rounded-lg flex items-center gap-2.5 ${theme.userCardBg}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${theme.userAvatarWrapper} overflow-hidden`}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-[11px] font-bold ${theme.userAvatarText}`}>
                      {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold truncate leading-tight ${theme.userName}`}>{user?.name}</p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme.userRoleLabel}`}>{user?.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`nav-item group relative flex items-center gap-2.5 text-[12.5px] font-medium transition-colors rounded-lg px-2 py-2.5 w-full ${theme.logoutBtnHover} ${collapsed ? 'justify-center' : ''}`}
              style={{ overflow: 'visible' }}
            >
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
              {collapsed && <span className="nav-tooltip">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        <div
          className={`sm:hidden mobile-sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Sidebar Panel */}
        <div className={`sm:hidden mobile-sidebar-panel flex flex-col ${isMobileMenuOpen ? 'active' : ''} ${theme.sidebarBg}`}>
          <div className={`flex items-center justify-between px-4 py-5 border-b ${isAdmin ? 'border-gray-100' : 'border-stone-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${theme.logoContainer}`}>
                <Shield className={`w-4 h-4 ${theme.logoIcon}`} />
              </div>
              <div>
                <p className={`text-[13px] font-bold tracking-tight leading-tight ${theme.portalTitle}`}>
                  {isAdmin ? 'Admin' : 'Employee'}
                </p>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mt-0.5 ${theme.portalSubtitle}`}>EMS</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${theme.navItemInactive}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {getLinks().map((item) => {
              const isApprovalsPath = location.pathname.startsWith('/admin/approvals');
              const active = item.hasSubmenu ? isApprovalsPath : location.pathname === item.path;
              
              if (item.hasSubmenu) {
                const isOpen = isApprovalsOpen;
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setIsApprovalsOpen(!isOpen)}
                      className={`relative flex items-center w-full px-4 py-4 text-[14px] font-semibold transition-all duration-200 ${active ? theme.navItemActive : theme.navItemInactive}`}
                    >
                      {active && <span className="active-bar" />}
                      <span className={`mr-3.5 ${active ? theme.navIconActive : theme.navIconInactive}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.name}</span>
                      <div className="flex items-center gap-2">
                        {item.badge > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="ml-8 border-l border-gray-100 pl-4 space-y-1 py-1">
                        {item.subItems.map((sub) => {
                           const subActive = location.pathname === sub.path.split('?')[0] && (sub.path.includes('?') ? location.search.includes(sub.path.split('?')[1]) : !location.search);
                           return (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${subActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={subActive ? 'text-indigo-600' : 'text-gray-400'}>{sub.icon}</span>
                                {sub.name}
                              </div>
                              {sub.badge > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[9px] font-black">
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                           );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`relative flex items-center px-4 py-4 text-[14px] font-semibold transition-all duration-200 ${active ? theme.navItemActive : theme.navItemInactive
                    }`}
                >
                  {/* Active left bar */}
                  {active && <span className="active-bar" />}
                  <span className={`mr-3.5 ${active ? theme.navIconActive : theme.navIconInactive}`}>
                    {item.icon}
                  </span>
                  {item.name}
                  {item.badge > 0 && (
                    <span className="ml-auto min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className={`border-t p-4 ${theme.userWrapperBorder}`}>
            <div className={`p-3 flex items-center gap-3 mb-3 ${theme.userCardBg}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${theme.userAvatarWrapper} overflow-hidden`}>
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`text-[13px] font-bold ${theme.userAvatarText}`}>
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-bold truncate ${theme.userName}`}>{user?.name}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.userRoleLabel}`}>{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-[14px] font-semibold transition-all ${theme.logoutBtnHover}`}
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col sidebar-transition ${collapsed ? 'sm:ml-[60px]' : 'sm:ml-60'}`}>
          {/* Top Header */}
          <header className={`sticky top-0 z-20 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${theme.headerAreaBg}`}>
            <div className="flex items-center sm:hidden gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`p-2 -ml-2 rounded-lg transition-colors ${theme.navItemInactive}`}
              >
                <Menu className={`w-6 h-6 ${theme.headerIcon}`} />
              </button>
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${theme.headerIcon}`} />
                <span className={`font-bold text-base tracking-tight ${theme.headerTitleText}`}>EMS Portal</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              {isAdmin && pendingCount > 0 && (
                <Link
                  to="/admin/approvals"
                  className="relative flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors border border-red-100"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
                </Link>
              )}
              <div className={`hidden sm:flex items-center gap-2 border px-3 py-1.5 rounded-full ${theme.headerUserPill}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${theme.headerUserAvatarPillBg} overflow-hidden`}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-[10px] font-bold ${theme.headerUserAvatarPillText}`}>{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</span>
                  )}
                </div>
                <span className={`text-[12.5px] font-semibold ${theme.headerUserNameText}`}>{user?.name}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.headerUserRoleText}`}>({user?.role})</span>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;
