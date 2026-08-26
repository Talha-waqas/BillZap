import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Settings as SettingsIcon, 
  CreditCard, 
  LogOut,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface SidebarProps {
  currentPath: string;
  userEmail: string;
  userName: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  userEmail,
  userName,
  onNavigate,
  isOpen,
  onClose
}) => {
  const navItems = [
    { label: 'Dashboard', path: 'dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Invoices', path: 'invoices', icon: <Receipt size={18} /> },
    { label: 'Customers', path: 'customers', icon: <Users size={18} /> },
    { label: 'Settings', path: 'settings', icon: <SettingsIcon size={18} /> },
    { label: 'Billing', path: 'billing', icon: <CreditCard size={18} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = '#landing';
  };

  const handleNavItemClick = (path: string) => {
    onNavigate(path);
    onClose(); // Close mobile sidebar if open
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div className="sidebar-backdrop no-print" onClick={onClose} />
      )}

      <aside className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Zap size={22} fill="var(--color-primary)" />
          <span>BillZap</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '-');
            return (
              <button
                key={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavItemClick(item.path)}
                style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(userName || userEmail)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{userName || 'Business Owner'}</span>
              <span className="sidebar-user-email">{userEmail}</span>
            </div>
          </div>

          <button
            className="sidebar-item btn-danger"
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-sm)',
              padding: '0.625rem var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              marginTop: 'var(--space-xs)'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
