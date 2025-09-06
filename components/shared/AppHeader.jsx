import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserPlus,
  BookOpen
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppHeader({ user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.pathname + window.location.search);
  }, []);

  const getNavItems = () => {
    const baseItems = [];

    if (user?.role === 'admin' || user?.title === 'Project Manager') {
      baseItems.push({ label: 'Onboarding', href: createPageUrl('EmployeeOnboarding'), icon: <UserPlus className="w-4 h-4" /> });
    }

    baseItems.push({ label: 'Spaces', href: createPageUrl('Dashboard'), icon: <LayoutGrid className="w-4 h-4" /> });
    baseItems.push({ label: 'Knowledge Base', href: createPageUrl('KnowledgeBase'), icon: <BookOpen className="w-4 h-4" /> });
    
    return baseItems;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

  return (
    <header className="bg-card/30 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
              <img src="https://i.imgur.com/k9u1k0a.png" alt="One PM Space Logo" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground whitespace-nowrap">One PM Space</span>
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = currentUrl === item.href;
                return (
                  <Link key={item.label} to={item.href}>
                    <Button variant={isActive ? 'secondary' : 'ghost'} className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || ''}
                  </div>
                  <span className="hidden lg:inline">{user?.first_name} {user?.last_name}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card/80 backdrop-blur-lg pb-4">
          <nav className="flex flex-col gap-2 px-4">
            {navItems.map((item) => {
              const isActive = currentUrl === item.href;
              return (
                <Link key={item.label} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant={isActive ? 'secondary' : 'ghost'} className="w-full justify-start text-lg py-6">
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}