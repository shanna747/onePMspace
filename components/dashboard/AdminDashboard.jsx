
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import { TimelineItem } from "@/api/entities";
import { ResponseBotConfig } from "@/api/entities";
import { GlobalSettings } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import BotConfigForm from './shared/BotConfigForm';
import GlobalSettingsForm from './shared/GlobalSettingsForm';
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import LeftPanel from '../shared/LeftPanel';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { format } from "date-fns";
import {
  Shield,
  Plus,
  Users,
  AlertTriangle,
  DollarSign,
  Archive,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Menu,
  Bot, // Removed LayoutGrid
  ListChecks,
  LogOut,
  Trash2,
  CheckCircle,
  ShieldCheck,
  ChevronRight,
  FolderOpen,
  BookOpen,
  MessageCircle,
  ChevronRightIcon
} from "lucide-react";
import AITopicsGraph from '../dashboard/client/health/AITopicsGraph';


export default function AdminDashboard({ user }) {
  const [botConfig, setBotConfig] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [projectManagers, setProjectManagers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    overdueIssues: 0,
    totalValue: 0,
    projectManagers: 0
  });
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGlobalSettingsDropdown, setShowGlobalSettingsDropdown] = useState(false);

  // useEffect for data loading (depends on allUsers)
  useEffect(() => {
    // Define all data loading functions inside useEffect to capture dependencies correctly
    const loadUsersAndManagers = async () => {
      const users = await User.list();
      setAllUsers(users); // This will cause the useEffect to re-run
      const pms = users.filter((u) => u.title === 'Project Manager');
      setProjectManagers(pms);
      setStats((prev) => ({ ...prev, projectManagers: pms.length }));
    };

    const loadDashboardData = async () => {
      // Fetch all projects
      let allProjects = await Project.list('-created_date');

      // Fix Project Manager Dashboard Visibility: Filter projects based on user role
      if (user && user.title === 'Project Manager') {
        const currentUserId = user.id;
        allProjects = allProjects.filter(project => {
          // A Project Manager sees projects they manage or are a team member of
          const isProjectManager = project.project_manager_id === currentUserId;
          const isTeamMember = project.team_member_ids && project.team_member_ids.includes(currentUserId);
          return isProjectManager || isTeamMember;
        });
      }

      // The original code included an `enrichProjectData` function here that utilized `allUsers`
      // to add `project_manager_info` and `team_members_info` to projects.
      // Based on the provided outline which removed this logic, it is omitted from this implementation.
      // This means ProjectCard will receive projects without these enriched properties.
      // ProjectCard's reliance on `project.team_members_info` is handled gracefully via `|| []`.

      const activeProjectsList = allProjects.filter((p) => p.status !== 'archived');
      const archivedProjectsList = allProjects.filter((p) => p.status === 'archived');

      setProjects(activeProjectsList);
      setArchivedProjects(archivedProjectsList);

      const activeProjects = activeProjectsList.filter((p) => p.status === 'active');

      const overdueProjectsCount = activeProjectsList.filter((p) =>
        p.end_date && new Date(p.end_date) < new Date() && p.status === 'active'
      ).length;

      const totalValue = activeProjects.reduce((sum, p) => sum + (p.value || 0), 0);

      setStats((prev) => ({
        ...prev,
        activeProjects: activeProjects.length,
        overdueIssues: overdueProjectsCount,
        totalValue
      }));
    };

    const loadBotConfig = async () => {
      const configs = await ResponseBotConfig.list();
      setBotConfig(configs[0] || null);
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

    const initDashboard = async () => {
      setLoading(true);
      try {
        // Only load users if not already loaded to prevent infinite loop due to 'allUsers' dependency
        if (allUsers.length === 0) {
          await loadUsersAndManagers();
        }
        
        // Load dashboard data. This will run on initial load and when allUsers changes.
        // It's important that loadDashboardData now relies on the `allUsers` state directly,
        // which is updated by loadUsersAndManagers.
        await loadDashboardData();
        await loadBotConfig();
        await loadGlobalSettings();
      } catch (error) {
        console.error("Failed to initialize dashboard:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    // Call initDashboard on component mount or when allUsers state changes
    initDashboard();

  }, [allUsers, user]); // Added 'user' to dependency array as loadDashboardData now depends on user.title and user.id

  // useEffect for event listeners (empty dependency array)
  useEffect(() => {
    const handleOpenGlobalSettings = () => {
      setShowGlobalSettings(true);
      setShowLeftPanel(false);
      setIsSidebarOpen(false);
    };
    const handleOpenBotConfig = () => {
      setShowBotConfig(true);
      setShowLeftPanel(false);
      setIsSidebarOpen(false);
    };
    // handleToggleLeftPanel and its listeners removed

    window.addEventListener('openGlobalSettings', handleOpenGlobalSettings);
    window.addEventListener('openBotConfig', handleOpenBotConfig);
    // Removed: window.addEventListener('toggleLeftPanel', handleToggleLeftPanel);

    return () => {
      window.removeEventListener('openGlobalSettings', handleOpenGlobalSettings);
      window.removeEventListener('openBotConfig', handleOpenBotConfig);
      // Removed: window.removeEventListener('toggleLeftPanel', handleToggleLeftPanel);
    };
  }, []); // Empty dependency array means these listeners are set up once on mount

  const handleSaveBotConfig = async (config) => {
    setLoading(true);
    try {
      if (botConfig) {
        await ResponseBotConfig.update(botConfig.id, config);
      } else {
        await ResponseBotConfig.create(config);
      }
      // Re-load bot config directly after saving
      const configs = await ResponseBotConfig.list();
      setBotConfig(configs[0] || null);
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

  // Re-define `loadDashboardData` and `loadUsersAndManagers` if they are called elsewhere outside `useEffect`
  // For the purpose of this change, these helper functions are now implicitly part of the useEffect logic
  // and are not intended to be called standalone from other event handlers without a full re-evaluation of dependencies.
  // The original separate definitions are removed as per the outline's implication.

  const handleArchiveProject = async (projectId) => {
    try {
      await Project.update(projectId, { status: 'archived' });
      toast({
        title: "Project Archived",
        description: "The project has been successfully moved to archives."
      });
      // Re-load all dashboard data after an action
      // Call initDashboard to refresh data
      setLoading(true);
      try {
        // We need to re-fetch users and then dashboard data
        const users = await User.list();
        setAllUsers(users); // This will cause `useEffect` to re-run and re-load dashboard data
      } catch (error) {
        console.error("Failed to re-initialize dashboard after archive:", error);
        toast({
          title: "Error",
          description: "Failed to refresh dashboard data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: "Failed to archive project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCompleteProject = async (projectId) => {
    setLoading(true);
    try {
      await Project.update(projectId, { status: 'completed' });
      toast({
        title: "Project Completed",
        description: "The project has been marked as completed."
      });
      // Re-load all dashboard data after an action
      // Call initDashboard to refresh data
      const users = await User.list();
      setAllUsers(users); // This will cause `useEffect` to re-run and re-load dashboard data
    } catch (error) {
      console.error("Error completing project:", error);
      toast({
        title: "Error",
        description: "Failed to mark project as completed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveProject = async (project) => {
    try {
      await Project.update(project.id, { status: 'active' });

      const banner = document.createElement('div');
      banner.className = 'fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      banner.style.backgroundColor = '#000000';
      banner.textContent = `Project "${project.name}" has been unarchived and is now active.`;
      document.body.appendChild(banner);

      setTimeout(() => {
        banner.remove();
      }, 3000);

      // Re-load all dashboard data after an action
      // Call initDashboard to refresh data
      const users = await User.list();
      setAllUsers(users); // This will cause `useEffect` to re-run and re-load dashboard data
    } catch (error) {
      console.error("Error unarchiving project:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to permanently delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await Project.delete(projectId);
      toast({
        title: "Project Deleted",
        description: "The project has been permanently deleted."
      });
      // Re-load all dashboard data after an action
      // Call initDashboard to refresh data
      const users = await User.list();
      setAllUsers(users); // This will cause `useEffect` to re-run and re-load dashboard data
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    }
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

  return (
    <div className="relative min-h-screen md:flex bg-background">
      {/* Left Panel Overlay */}
      {showLeftPanel &&
        <div className="fixed inset-0 z-[100] flex">
          <LeftPanel user={user} onClose={() => setShowLeftPanel(false)} />
          <div className="flex-1 bg-black bg-opacity-50"
            onClick={() => setShowLeftPanel(false)} />
        </div>
      }

      {/* Mobile-first Sidebar */}
      {isSidebarOpen &&
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setIsSidebarOpen(false)}></div>
      }
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border w-80 p-6 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-foreground text-xl font-bold">Admin</h2>
              <p className="text-muted-foreground text-sm">Master Dashboard</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow space-y-3">
          {/* Primary Action */}
          <Link to={createPageUrl("AddProject")}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full justify-start text-base py-6">
              <Plus className="w-5 h-5 mr-3" />
              Add Space
            </Button>
          </Link>

          {/* Collaboration Hub Button - Removed */}

          {/* Global Settings Dropdown */}
          <div className="pt-6">
            <div className="px-2 mb-3 flex items-center justify-between cursor-pointer" onClick={() => setShowGlobalSettingsDropdown(!showGlobalSettingsDropdown)}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Global Settings</h3>
              {showGlobalSettingsDropdown ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
            {showGlobalSettingsDropdown &&
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={() => setShowGlobalSettings(true)}>
                  <Settings className="w-4 h-4 mr-3" />
                  Feature Settings
                </Button>
                <Link to={createPageUrl('UserManagement')}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary">
                    <Users className="w-4 h-4 mr-3" />
                    Manage Users
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={() => setShowBotConfig(true)}>
                  <Bot className="w-4 h-4 mr-3" />
                  Configure Support Bot
                </Button>
                <Link to={createPageUrl('AdminTimelineTemplates')}>
                  <Button
                    variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary">
                    <ListChecks className="w-4 h-4 mr-3" />
                    Timeline Templates
                  </Button>
                </Link>
              </div>
            }
          </div>
        </div>

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

        {/* Logout Button at bottom */}
        <div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-primary" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
          <div className="w-6"></div>
        </div>

        {/* Top Navigation Bar is removed */}

        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-foreground mb-2">Company Dashboard</h1>
            <p className="text-lg text-muted-foreground">Welcome back, {user.first_name || user.full_name}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Project Managers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.projectManagers}</div>
                    <p className="text-xs text-muted-foreground">Assigned team members</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Projects</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.overdueIssues}</div>
                    <p className="text-xs text-muted-foreground">Past end date</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Project Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                         {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.totalValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">Active projects total</p>
                </CardContent>
            </Card>
          </div>


          {/* Projects Section */}
          <div className="bg-card/50 border border-border rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">Company Spaces ({projects.length})</h3>
            <p className="text-sm text-muted-foreground mb-8">Overview of projects managed by your team</p>
            {projects.length === 0 ?
              <div className="text-center py-16">
                <FolderOpen className="w-20 h-20 text-muted-foreground/50 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-3">No projects yet</h3>
                <p className="text-muted-foreground mb-8">Create your first client space to get started</p>
                <Link to={createPageUrl("AddProject")}>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Space
                  </Button>
                </Link>
              </div> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) =>
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onArchive={() => handleArchiveProject(project.id)}
                    onComplete={() => handleCompleteProject(project.id)}
                    userTitle={user.title}
                  />
                )}
              </div>
            }
          </div>

          {/* Archived Projects Section */}
          <Card className="bg-card/50 border border-border">
            <div className="p-6 cursor-pointer border-b border-border" onClick={() => setShowArchived(!showArchived)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Archive className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Archived Spaces ({archivedProjects.length})</h3>
                    <p className="text-sm text-muted-foreground">View projects that are no longer active</p>
                  </div>
                </div>
                {showArchived ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
              </div>
            </div>
            {showArchived &&
              <div className="p-6">
                {archivedProjects.length === 0 ?
                  <div className="text-center py-16 text-muted-foreground">
                    No archived projects.
                  </div> :
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedProjects.map((project) =>
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onUnarchive={() => handleUnarchiveProject(project)}
                        onDelete={() => handleDeleteProject(project.id, project.name)}
                        userTitle={user.title}
                      />
                    )}
                  </div>
                }
              </div>
            }
          </Card>
        </div>
      </main>
    </div>);

}

function ProjectCard({ project, onArchive, onComplete, onUnarchive, onDelete, userTitle }) {
  // `project.team_members_info` will be undefined if the parent component (AdminDashboard)
  // no longer enriches the project data with user information.
  // The `|| []` ensures that `teamMembers` is always an array, preventing crashes.
  // In this scenario, the 'No team members' message will appear if the info is not provided.
  const teamMembers = project.team_members_info || [];

  const canDelete = userTitle === 'Project Manager' || userTitle === 'Admin';
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
          <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground pt-1">Team</span>
            <div className="flex -space-x-2 overflow-hidden justify-end">
              {teamMembers.slice(0, 3).map((member) =>
                <div key={member.id} title={`${member.first_name} ${member.last_name}`} className="h-7 w-7 rounded-full border border-black bg-slate-200 text-black flex items-center justify-center text-xs font-bold">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
              )}
              {teamMembers.length > 3 &&
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                  +{teamMembers.length - 3}
                </div>
              }
              {teamMembers.length === 0 && <span className="text-xs text-muted-foreground italic mt-1">No team members</span>}
            </div>
          </div>
        </div>

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

         <div className="pt-4 mt-2 border-t border-border flex flex-wrap gap-2 items-center">
            <Link
              to={createPageUrl(`ProjectSettings`, {id: project.id})}
              state={{ project: project }}
              className="flex-1">
              <Button variant="secondary" className="w-full text-secondary-foreground" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </Link>
            <Link to={createPageUrl(`ClientProjectView`, {id: project.id})}>
              <Button variant="outline" size="sm" className="flex-1 text-foreground border-border" title="View Client Dashboard">
                <BookOpen className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            {onComplete && project.status === 'active' &&
              <Button onClick={onComplete} variant="ghost" size="sm" className="px-3 text-muted-foreground hover:text-foreground" title="Mark as Complete">
                <CheckCircle className="w-4 h-4" />
              </Button>
            }
            {onArchive && project.status === 'active' &&
              <Button onClick={onArchive} variant="ghost" size="sm" className="px-3 text-muted-foreground hover:text-foreground" title="Archive Project">
                <Archive className="w-4 h-4" />
              </Button>
            }
            {onUnarchive && project.status === 'archived' &&
              <Button onClick={onUnarchive} variant="secondary" size="sm" className="px-3 text-secondary-foreground">
                Unarchive
              </Button>
            }
            {onDelete && canDelete &&
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="px-3 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                title="Permanently Delete Project">
                <Trash2 className="w-4 h-4" />
              </Button>
            }
          </div>
      </CardContent>
    </Card>);
}
