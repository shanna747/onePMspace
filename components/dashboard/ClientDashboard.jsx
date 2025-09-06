
import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/api/entities";
import { GlobalSettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageCircle,
  FileText,
  ListChecks,
  Bot,
  TestTube,
  User as UserIcon,
  HeartPulse,
  Users
} from "lucide-react";
import ProjectChat from "../project/ProjectChat";
import ProjectFiles from "../project/ProjectFiles";
import ProjectTimeline from "../project/ProjectTimeline";
import ProjectBot from "../project/ProjectBot";
import ProjectTesting from "../project/ProjectTesting";
import ProjectOverview from "./client/ProjectOverview";
import ClientHealthDashboard from "./client/ClientHealthDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientDashboard({ user, project, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const tabs = useMemo(() => {
    if (!project || !globalSettings || !user) return [];
    const features = project.features_enabled || {};
    const isAdminOrPM = user.role === 'admin' || user.title === 'Project Manager';

    return [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, enabled: true },
      { id: 'health', label: 'Health', icon: HeartPulse, enabled: isAdminOrPM },
      { id: 'timeline', label: 'Timeline', icon: ListChecks, enabled: features.timeline !== false && globalSettings.timeline_enabled !== false },
      { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.chat !== false && globalSettings.chat_enabled !== false },
      { id: 'files', label: 'Files', icon: FileText, enabled: features.files !== false && globalSettings.files_enabled !== false },
      { id: 'bot', label: 'Support', icon: Bot, enabled: features.response_bot !== false && globalSettings.response_bot_enabled !== false },
      { id: 'testing', label: 'Testing', icon: TestTube, enabled: features.testing !== false && globalSettings.testing_enabled !== false }
    ].filter((tab) => tab.enabled);
  }, [project, globalSettings, user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (!project) {
        setLoading(false);
        return;
      }
      try {
        const settingsList = await GlobalSettings.list();
        const settings = settingsList[0] || {
          chat_enabled: true,
          files_enabled: true,
          timeline_enabled: true,
          response_bot_enabled: true,
          testing_enabled: true
        };
        setGlobalSettings(settings);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setGlobalSettings({
          chat_enabled: true,
          files_enabled: true,
          timeline_enabled: true,
          response_bot_enabled: true,
          testing_enabled: true
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [project]);

  // When the available tabs change, update the active tab
  useEffect(() => {
    if (tabs.length > 0) {
      if (!tabs.find((t) => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
      }
    } else {
      setActiveTab('');
    }
  }, [tabs, activeTab]);

  // Check for tab parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabs]); // Add tabs to dependency array because we access `tabs.find`

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = 'https://onepmspace.com';
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = 'https://onepmspace.com';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Welcome, {user?.first_name || user?.full_name}!</h2>
            <p className="text-muted-foreground mb-6">
              Your project manager will set up your project shortly. Please check back later or contact us if you have any questions.
            </p>
            <Button onClick={handleLogout} className="bg-primary hover:bg-primary/90">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle archived project
  if (project.status === 'archived') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full mx-auto">
           <CardContent className="text-center p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Project Archived</h2>
            <p className="text-muted-foreground mb-6">
              This project has been archived and is no longer accessible. Please contact your project manager for assistance.
            </p>
            {project.project_manager_info && (
              <div className="bg-secondary border border-border rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-foreground">Project Manager:</p>
                <p className="text-muted-foreground">{project.project_manager_info.first_name} {project.project_manager_info.last_name}</p>
              </div>
            )}
            <Button onClick={handleLogout} className="bg-primary hover:bg-primary/90">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectOverview project={project} />;
      case 'health':
        return <ClientHealthDashboard project={project} />;
      case 'chat':
        return <ProjectChat project={project} user={user} />;
      case 'files':
        return <ProjectFiles project={project} user={user} />;
      case 'timeline':
        return <ProjectTimeline project={project} user={user} />;
      case 'bot':
        return <ProjectBot project={project} user={user} />;
      case 'testing':
        return <ProjectTesting project={project} user={user} />;
      default:
        return tabs.length > 0 ?
          <ProjectOverview project={project} /> :
          <div className="text-center text-muted-foreground py-16">No active features or content to display.</div>;
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                {project.logo_url ? (
                  <img src={project.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: project.accent_color || '#9333EA' }}
                  >
                    {project.client_name?.[0] || 'C'}
                  </div>
                )}
                <div>
                  <h1 className="text-foreground font-bold text-2xl">{project.name}</h1>
                  <p className="text-muted-foreground">Welcome back, {user?.first_name || user?.full_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-secondary/30 border border-border rounded-xl p-1.5 mb-8 inline-flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === tab.id ?
                'bg-primary text-primary-foreground shadow-sm' :
                'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
              `}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[600px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
