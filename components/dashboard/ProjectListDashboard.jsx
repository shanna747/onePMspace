
import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import { GlobalSettings } from "@/api/entities";
import { ResponseBotConfig } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FolderOpen,
  Settings,
  Calendar,
  BarChart3,
  Briefcase,
  Archive,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Trash2,
  CheckCircle,
  ShieldCheck,
  LayoutGrid,
  Users,
  ListChecks,
  Bot,
  BookOpen,
  MessageCircle,
  ChevronRightIcon
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LeftPanel from '../shared/LeftPanel';
import BotConfigForm from './shared/BotConfigForm';
import GlobalSettingsForm from './shared/GlobalSettingsForm';
import { toast } from "@/components/ui/use-toast";
import AITopicsGraph from './client/health/AITopicsGraph';

export default function ProjectListDashboard({ user, projects: initialProjects, onRefresh }) {
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showGlobalSettingsDropdown, setShowGlobalSettingsDropdown] = useState(false);
  const [botConfig, setBotConfig] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialProjects) {
      const nonArchived = initialProjects.filter(p => p.status !== 'archived');
      const archived = initialProjects.filter(p => p.status === 'archived');
      setProjects(nonArchived);
      setArchivedProjects(archived);
    }

    loadBotConfig();
    loadGlobalSettings();

    // Listen for custom events from dropdown buttons
    const handleOpenGlobalSettings = () => {
      setShowGlobalSettings(true);
      setShowGlobalSettingsDropdown(false);
    };
    const handleOpenBotConfig = () => {
      setShowBotConfig(true);
      setShowGlobalSettingsDropdown(false);
    };

    window.addEventListener('openGlobalSettings', handleOpenGlobalSettings);
    window.addEventListener('openBotConfig', handleOpenBotConfig);

    return () => {
      window.removeEventListener('openGlobalSettings', handleOpenGlobalSettings);
      window.removeEventListener('openBotConfig', handleOpenBotConfig);
    };
  }, [initialProjects]);

  const loadBotConfig = async () => {
    try {
      const configs = await ResponseBotConfig.list();
      setBotConfig(configs[0] || null);
    } catch (error) {
      console.error("Error loading bot config:", error);
    }
  };

  const loadGlobalSettings = async () => {
    try {
      const settings = await GlobalSettings.list();
      if (settings.length > 0) {
        setGlobalSettings(settings[0]);
      } else {
        const newSettings = await GlobalSettings.create({});
        setGlobalSettings(newSettings);
      }
    } catch (error) {
      console.error("Error loading global settings:", error);
      setGlobalSettings(null);
    }
  };

  const handleSaveBotConfig = async (config) => {
    setLoading(true);
    try {
      if (botConfig) {
        await ResponseBotConfig.update(botConfig.id, config);
      } else {
        await ResponseBotConfig.create(config);
      }
      loadBotConfig();
      setShowBotConfig(false);
      toast({
        title: "Bot Config Saved",
        description: "Response bot configuration updated successfully."
      });
    } catch (error) {
      console.error("Error saving bot config:", error);
      toast({
        title: "Error",
        description: "Failed to save bot configuration. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleSaveGlobalSettings = async (settingsToSave) => {
    setLoading(true);
    try {
      if (globalSettings) {
        const updatedSettings = await GlobalSettings.update(globalSettings.id, settingsToSave);
        setGlobalSettings(updatedSettings);
      } else {
        const newSettings = await GlobalSettings.create(settingsToSave);
        setGlobalSettings(newSettings);
      }
      setShowGlobalSettings(false);
      toast({
        title: "Settings Saved",
        description: "Global settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving global settings:", error);
      toast({
        title: "Error",
        description: "Failed to save global settings. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = 'https://onepmspace.com';
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = 'https://onepmspace.com';
    }
  };

  const handleArchiveProject = async (projectId) => {
    try {
      await Project.update(projectId, { status: 'archived' });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error archiving project", e);
    }
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await Project.update(projectId, { status: 'completed' });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error completing project", e);
    }
  };

  const handleUnarchiveProject = async (project) => {
    try {
      const updatedProject = await Project.update(project.id, { status: 'active' });

      // Show success banner with black background
      const banner = document.createElement('div');
      banner.className = 'fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      banner.style.backgroundColor = '#000000';
      banner.textContent = `Project "${project.name}" has been unarchived and is now active.`;
      document.body.appendChild(banner);

      setTimeout(() => {
        banner.remove();
      }, 3000);

      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error unarchiving project", e);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to permanently delete "${projectName}"? This action cannot be undone."`)) {
      return;
    }

    try {
      await Project.delete(projectId);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error deleting project", e);
      alert("Failed to delete project. Please try again.");
    }
  };

  const getProjectStats = () => {
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    const totalValue = projects.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.value || 0), 0);
    return { active, completed, onHold, totalValue };
  };

  const stats = getProjectStats();
  const isManager = user.title === 'Project Manager';
  const canCreateSpace = user.role === 'admin' || user.title === 'Admin' || user.title === 'Project Manager';

  return (
    <div className="min-h-screen bg-background relative">
      {/* Left Panel Overlay */}
      {showLeftPanel && (
        <div className="fixed inset-0 z-50 flex">
          <LeftPanel user={user} onClose={() => setShowLeftPanel(false)} />
          <div
            className="flex-1 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setShowLeftPanel(false)}
          />
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showBotConfig} onOpenChange={setShowBotConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Response Bot</DialogTitle>
          </DialogHeader>
          <BotConfigForm
            config={botConfig}
            onSubmit={handleSaveBotConfig}
            loading={loading} />
        </DialogContent>
      </Dialog>

      <Dialog open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Global Feature Settings</DialogTitle>
            <DialogDescription>
              Enable or disable features across the entire platform for all users.
            </DialogDescription>
          </DialogHeader>
          <GlobalSettingsForm
            settings={globalSettings}
            onSave={handleSaveGlobalSettings}
            loading={loading} />
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{user.title === 'Client' ? 'My Projects' : (user.title || 'My Projects')}</h1>
                  <p className="text-muted-foreground">Welcome back, {user.first_name || user.full_name}</p>
                </div>
              </div>
            </div>
            
            {/* "Create New Space" button is only visible to Admins and Project Managers */}
            {canCreateSpace && (
              <Link to={createPageUrl("AddProject")}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Space
                </Button>
              </Link>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.active}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">On Hold</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.onHold}</div>
                </CardContent>
            </Card>
            {user.title !== 'Client' && (
              <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.totalValue)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Client Projects Grid */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-foreground">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
                <span>Your Active Spaces</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <FolderOpen className="w-20 h-20 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No active spaces yet</h3>
                  <p className="text-muted-foreground mb-6">It looks like you don't have any active spaces yet. Start by creating a new one.</p>
                  {canCreateSpace && (
                    <Link to={createPageUrl("AddProject")}>
                      <Button size="lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Space
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onArchive={isManager ? () => handleArchiveProject(project.id) : null}
                      onComplete={isManager ? () => handleCompleteProject(project.id) : null}
                      onUnarchive={isManager ? () => handleUnarchiveProject(project) : null}
                      onDelete={isManager ? () => handleDeleteProject(project.id, project.name) : null}
                      userTitle={user.title}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Archived Projects Section */}
          <div className="mt-8">
            <Card className="bg-card/50 border-border">
              <CardHeader className="cursor-pointer" onClick={() => setShowArchived(!showArchived)}>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Archive className="w-6 h-6 text-muted-foreground" />
                    <span>Archived Client Spaces</span>
                  </CardTitle>
                  {showArchived ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
              {showArchived && (
                <CardContent>
                  {archivedProjects.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No archived spaces.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {archivedProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onUnarchive={isManager ? () => handleUnarchiveProject(project) : null}
                          onDelete={isManager ? () => handleDeleteProject(project.id, project.name) : null}
                          userTitle={user.title}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onArchive, onComplete, onUnarchive, onDelete, userTitle }) {
  const teamMembers = project.team_members_info || [];
  const canDelete = userTitle === 'Project Manager';
  const [showHealth, setShowHealth] = useState(false);

  return (
     <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project.logo_url ?
              <img
                src={project.logo_url}
                alt="Client logo"
                className="w-12 h-12 rounded-lg object-cover" /> :
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-primary-foreground font-medium"
                style={{ backgroundColor: project.accent_color || '#9333EA' }}>
                {project.client_name?.[0] || 'C'}
              </div>
            }
            <div>
              <CardTitle className="text-base text-foreground">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {project.client_name}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Start Date</span>
            <span className="font-medium text-foreground">
              {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">End Date</span>
            <span className="font-medium text-foreground">
              {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between text-sm items-start">
            <span className="text-muted-foreground pt-1">Team</span>
            <div className="flex -space-x-2 overflow-hidden justify-end">
              {teamMembers.slice(0, 3).map(member => (
                 <div key={member.id} title={`${member.first_name} ${member.last_name}`} className="inline-block h-7 w-7 rounded-full border border-black bg-slate-200 text-black flex items-center justify-center text-xs font-bold">
                   {member.first_name?.[0]}{member.last_name?.[0]}
                 </div>
              ))}
              {teamMembers.length > 3 && (
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                  +{teamMembers.length - 3}
                </div>
              )}
               {teamMembers.length === 0 && <span className="text-xs text-muted-foreground italic mt-1">No team members</span>}
            </div>
          </div>
        </div>
        
        {userTitle === 'Project Manager' && (
          <div className="mt-4">
            <div 
              className="flex justify-between items-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setShowHealth(!showHealth)}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Client AI Topics</span>
              </div>
              <ChevronRightIcon className={`w-4 h-4 transition-transform ${showHealth ? 'rotate-90' : ''}`} />
            </div>
            {showHealth && (
              <div className="pt-2">
                 <AITopicsGraph project={project} />
              </div>
            )}
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-border flex flex-wrap gap-2 items-center">
            {userTitle === 'Project Manager' ? (
              <>
                <Link
                  to={createPageUrl(`ProjectSettings?id=${project.id}`)}
                  className="flex-1"
                  state={{ project: project }}
                >
                  <Button variant="secondary" className="w-full text-secondary-foreground" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </Link>
                <Link to={createPageUrl(`ClientProjectView?id=${project.id}`)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-foreground border-border" title="View Client Dashboard">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <Link to={createPageUrl(`ClientProjectView?id=${project.id}`)} className="w-full">
                <Button className="w-full text-primary-foreground" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open Space
                </Button>
              </Link>
            )}

            {onComplete && project.status === 'active' && (
              <Button onClick={onComplete} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Mark as Complete">
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
            {onArchive && project.status === 'active' && (
              <Button onClick={onArchive} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Archive Project">
                <Archive className="w-4 h-4" />
              </Button>
            )}
            {onUnarchive && project.status === 'archived' && (
              <Button onClick={onUnarchive} variant="secondary" size="sm" className="px-3 text-secondary-foreground">
                Unarchive
              </Button>
            )}
            {onDelete && canDelete && (
              <Button
                onClick={onDelete}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                title="Permanently Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
      </CardContent>
    </Card>
  );
}
