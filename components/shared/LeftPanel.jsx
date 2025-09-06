import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  X,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  Users,
  Settings,
  ClipboardList,
  ChevronDown,
  BookOpen,
} from 'lucide-react';

const NavLink = ({ to, icon: Icon, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      isActive
        ? 'bg-purple-600 text-white font-semibold'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`}>
      <Icon className="w-5 h-5" />
      <span>{children}</span>
    </Link>
  );
};

export default function LeftPanel({ user, onClose }) {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(true);
  const isAdmin = user.role === 'admin' || user.title === 'Admin';
  const isProjectManager = user.title === 'Project Manager';

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

  return (
    <div className="fixed inset-y-0 left-0 w-72 bg-black flex flex-col z-50 text-white shadow-2xl" style={{ background: 'linear-gradient(180deg, #100a16 0%, #050109 100%)' }}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserIcon className="w-8 h-8 p-1.5 bg-purple-600 rounded-lg" />
          <div>
            <p className="font-bold">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-white/60">{user.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <NavLink to={createPageUrl('Dashboard')} icon={LayoutDashboard} onClick={onClose}>
          Dashboard
        </NavLink>
        {(isAdmin || isProjectManager) && (
          <NavLink to={createPageUrl('EmployeeOnboarding')} icon={GraduationCap} onClick={onClose}>
            Employee Onboarding
          </NavLink>
        )}
        
        {isAdmin && (
          <div className="pt-4">
            <button
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-white/50"
            >
              ADMINISTRATION
              <ChevronDown className={`w-5 h-5 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isAdminMenuOpen && (
              <div className="pt-2 space-y-2">
                <NavLink to={createPageUrl('AdminKnowledgeBase')} icon={BookOpen} onClick={onClose}>
                  Knowledge Base
                </NavLink>
                <NavLink to={createPageUrl('UserManagement')} icon={Users} onClick={onClose}>
                  User Management
                </NavLink>
                <NavLink to={createPageUrl('AdminTimelineTemplates')} icon={ClipboardList} onClick={onClose}>
                  Timeline Templates
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/10">
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}