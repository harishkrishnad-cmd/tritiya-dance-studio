import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music2, ClipboardCheck,
  CreditCard, Settings, Menu, X, Upload, BookOpen, Globe
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/import', label: 'Import Students', icon: Upload },
  { to: '/classes', label: 'Classes', icon: Music2 },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/lesson-planner', label: 'Lesson Planner', icon: BookOpen },
  { to: '/lms', label: 'Learning Hub', icon: BookOpen },
  { to: '/website', label: 'Website Editor', icon: Globe },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children, schoolName, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-apple-gray">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-apple-dark transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-apple-blue rounded-lg flex items-center justify-center text-base select-none">🪷</div>
              <div>
                <div className="text-white font-semibold text-sm leading-tight truncate max-w-[130px]">{schoolName || 'Tritiya Dance Studio'}</div>
                <div className="text-white/40 text-xs">Admin Panel</div>
              </div>
            </div>
            <button className="lg:hidden text-white/40 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-apple-blue text-white'
                    : 'text-white/55 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Icon size={16} strokeWidth={isActive => isActive ? 2.2 : 1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-2 border-t border-white/8">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium text-white/40 hover:text-white hover:bg-white/8 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-apple-gray-2 px-4 py-3 flex items-center gap-3 lg:hidden sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-apple-gray rounded-lg -ml-1">
            <Menu size={20} className="text-apple-text" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base select-none">🪷</span>
            <span className="font-semibold text-apple-text truncate text-sm">{schoolName || 'Tritiya Dance Studio'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
