
import React, { useState, useEffect, useMemo } from "react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppHeader from '@/components/AppHeader';

// Entities (assuming they are interfaces or types for better type safety if using TypeScript)
import { User } from "@/api/entities"; // Corrected import based on outline
import { GlobalSettings } from "@/api/entities"; // Corrected import based on outline

// Lucide React Icons
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

// Project-specific components
import ProjectChat from "../project/ProjectChat";
import ProjectFiles from "../project/ProjectFiles";
import ProjectTimeline from "../project/ProjectTimeline";
import ProjectBot from "../project/ProjectBot";
import ProjectTesting from "../project/ProjectTesting";
import ProjectOverview from "./client/ProjectOverview";
import ClientHealthDashboard from "./client/ClientHealthDashboard";

export default function ClientDashboard({ user, project, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState(null); // Assuming GlobalSettings type

  // Memoize project if it's a complex object that might trigger unnecessary re-renders
  // though for simple prop passing, it might not be strictly necessary unless deep equality is an issue.
  // For consistency with outline, we'll keep the concept of memoized project, though directly using `project` is fine too.
  const memoizedProject = useMemo(() => project, [project]);

  const tabs = useMemo(() => {
    // Return empty array if crucial data is not yet loaded
    if (!project || !globalSettings || !user) return [];

    const features = project.features_enabled || {};

    // Define all possible tabs and their enablement conditions
    return [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, enabled: true }, // Always enabled
      { id: 'health', label: 'Health', icon: HeartPulse, enabled: true }, // Always enabled
      { id: 'timeline', label: 'Timeline', icon: ListChecks, enabled: features.timeline !== false && globalSettings.timeline_enabled !== false },
      { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.chat !== false && globalSettings.chat_enabled !== false },
      { id: 'files', label: 'Files', icon: FileText, enabled: features.files !== false && globalSettings.files_enabled !== false },
      { id: 'testing', label: 'Testing', icon: TestTube, enabled: features.testing !== false && globalSettings.testing_enabled !== false },
      { id: 'bot', label: 'Support', icon: Bot, enabled: features.response_bot !== false && globalSettings.response_bot_enabled !== false },
    ].filter((tab) => tab.enabled); // Filter out disabled tabs
  }, [project, globalSettings, user]); // Dependencies ensure re-calculation when project, globalSettings, or user change

  // Effect to load global settings or other initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate fetching global settings. Replace with actual API call if needed.
        // For example: const settings = await fetch('/api/global-settings').then(res => res.json());
        // setGlobalSettings(settings);

        // Mock global settings for demonstration.
        // In a real app, these would come from an API and reflect actual global feature flags.
        setGlobalSettings({
          timeline_enabled: true,
          chat_enabled: true,
          files_enabled: true,
          response_bot_enabled: true,
          testing_enabled: true,
        });
      } catch (error) {
        console.error("Failed to load global settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Run once on component mount

  // Effect to read active tab from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    // Check if the tabParam exists and is one of the valid tab IDs
    if (tabParam && tabs.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabs]); // Depend on 'tabs' to ensure they are loaded before checking URL param

  const handleLogout = async () => {
    console.log('User logged out.');
    // In a real application, this would handle user logout logic (e.g., clearing tokens, redirecting).
    // Example: await authService.logout();
    // window.location.href = '/login'; // Or similar navigation
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!memoizedProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The project you are trying to access does not exist or you do not have permission.
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
  if (memoizedProject.status === 'archived') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full mx-auto">
           <CardContent className="text-center p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Project Archived</h2>
            <p className="text-muted-foreground mb-6">
              This project has been archived and is no longer accessible. Please contact your project manager for assistance.
            </p>
            {(memoizedProject.project_managers_info || []).length > 0 && (
              <div className="bg-secondary border border-border rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-foreground mb-2">Project Managers:</p>
                <ul className="space-y-1">
                {memoizedProject.project_managers_info.map(pm => (
                  <li key={pm.id} className="text-muted-foreground">{pm.first_name} {pm.last_name}</li>
                ))}
                </ul>
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
        return <ProjectOverview project={project} user={user} />;
      case 'health':
        return <ClientHealthDashboard project={project} user={user} />; // Added user prop
      case 'chat':
        return <ProjectChat project={project} user={user} />;
      case 'files':
        return <ProjectFiles project={project} user={user} />;
      case 'timeline':
        // The onProjectUpdate prop is crucial for triggering a refresh of project data
        // after an action (like timeline publish) inside ProjectTimeline.
        return <ProjectTimeline project={project} user={user} onProjectUpdate={onRefresh} />;
      case 'bot':
        return <ProjectBot project={project} user={user} />;
      case 'testing':
        return <ProjectTesting project={project} user={user} />;
      default:
        // If no matching tab or tabs array is empty, show default overview or a message.
        // Ensure there's at least one tab before attempting to render.
        return tabs.length > 0 ?
          <ProjectOverview project={project} user={user} /> :
          <div className="text-center text-muted-foreground py-16">No active features or content to display.</div>;
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${memoizedProject?.logo_url || '/placeholder.svg'})` }}
    >
      <div className="min-h-screen bg-black/70 backdrop-blur-sm text-white">
        <AppHeader user={user} project={memoizedProject} onLogout={handleLogout} />
        <main className="p-4 md:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 bg-white/10 text-white border-none">
              {/* Map over the filtered tabs and use 'id' for key and value */}
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center space-x-2">
                  {tab.icon && React.createElement(tab.icon, { className: "w-4 h-4" })}
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {renderContent()}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
