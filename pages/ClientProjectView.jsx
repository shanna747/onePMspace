
import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, ListChecks, MessageSquare, FileText, TestTube, Bot, ArrowLeft, Settings, HeartPulse } from 'lucide-react';
import ProjectOverview from '../components/dashboard/client/ProjectOverview';
import ProjectTimeline from '../components/project/ProjectTimeline';
import ProjectChat from '../components/project/ProjectChat';
import ProjectFiles from '../components/project/ProjectFiles';
import ProjectTesting from '../components/project/ProjectTesting';
import ProjectBot from '../components/project/ProjectBot';
import ClientHealthDashboard from '../components/dashboard/client/ClientHealthDashboard';

export default function ClientProjectView() {
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const projectId = new URLSearchParams(window.location.search).get('id');

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const projectData = await Project.filter({ id: projectId });
      if (projectData.length > 0) {
        setProject(projectData[0]);
      }
    } catch (error) {
      console.error("Error loading project:", error);
      
      // Don't retry immediately on rate limit to avoid making it worse
      if (!error.message?.includes("Rate limit exceeded")) {
        // Only retry for non-rate-limit errors
        setTimeout(() => loadProject(), 2000);
      }
    }
  }, [projectId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        // Only load project if we don't have it yet
        if (!project && projectId) {
          await loadProject();
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
      setLoading(false);
    };
    
    loadData();
  }, [loadProject, projectId, project]);

  const handleProjectUpdate = (updatedProject) => {
    setProject(updatedProject);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center bg-background p-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Project not found</h2>
          <p className="text-muted-foreground mb-4">The project you are looking for does not exist or you do not have permission to view it.</p>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="link">Go back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const features = project.features_enabled || {};
  const isAdminOrPM = user && (user.role === 'admin' || user.title === 'Project Manager');
  
  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, enabled: true },
    { id: 'timeline', label: 'Timeline', icon: ListChecks, enabled: features.timeline },
    { id: 'health', label: 'Health', icon: HeartPulse, enabled: isAdminOrPM },
    { id: 'chat', label: 'Chat', icon: MessageSquare, enabled: features.chat },
    { id: 'files', label: 'Files', icon: FileText, enabled: features.files },
    { id: 'testing', label: 'Testing & Sign-off', icon: TestTube, enabled: features.testing },
    { id: 'bot', label: 'AI Assistant', icon: Bot, enabled: features.response_bot },
  ].filter(tab => tab.enabled);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectOverview project={project} user={user} />;
      case 'timeline':
        return <ProjectTimeline project={project} user={user} onProjectUpdate={handleProjectUpdate} />;
      case 'health':
        return <ClientHealthDashboard project={project} user={user} />;
      case 'chat':
        return <ProjectChat project={project} user={user} />;
      case 'files':
        return <ProjectFiles project={project} user={user} />;
      case 'testing':
        return <ProjectTesting project={project} user={user} />;
      case 'bot':
        return <ProjectBot project={project} user={user} />;
      default:
        return <ProjectOverview project={project} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card border-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline" size="icon" aria-label="Back to Dashboard">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-4">
                {project.logo_url ? (
                  <img src={project.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary flex-shrink-0"></div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
                  <p className="text-muted-foreground text-sm">
                    Project for <span className="font-medium text-foreground/80">{project.client_name}</span>
                  </p>
                </div>
              </div>
            </div>
            <Link to={createPageUrl(`ProjectSettings?id=${project.id}`)}>
              <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Project Info
              </Button>
            </Link>
          </div>

          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                <tab.icon className="-ml-0.5 mr-2 h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
