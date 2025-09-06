
import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { GlobalSettings } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MessageCircle,
  FileText,
  ListChecks,
  Bot,
  TestTube,
  Calendar,
  Users,
  Info,
  User as UserIcon,
  BookText // Added for Wiki feature
} from "lucide-react";
import { format } from "date-fns";

const MemberAvatar = ({ user }) => (
    <div
        className="w-8 h-8 rounded-full neumorphism-flat text-primary flex items-center justify-center font-bold text-xs"
        title={user ? `${user.first_name} ${user.last_name}` : '...'}
    >
        {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '?'}
    </div>
);

export default function ClientProjectManage() {
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const projectId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Loading project data for ID:", projectId);
      
      // Load user first
      const user = await User.me();
      setCurrentUser(user);
      console.log("Current user:", user);

      // Try to get the specific project directly first
      let targetProject = null;
      try {
        const projectResponse = await fetch(`https://base44.app/api/apps/${window.location.hostname.split('.')[0] || 'default'}/entities/Project/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${new URLSearchParams(window.location.search).get('access_token') || ''}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (projectResponse.ok) {
          targetProject = await projectResponse.json();
          console.log("Found project directly:", targetProject);
        }
      } catch (directFetchError) {
        console.log("Direct fetch failed, trying list approach:", directFetchError);
      }

      // If direct fetch failed, try the list approach
      if (!targetProject) {
        const allProjects = await Project.list('-created_date');
        console.log("All projects from list:", allProjects);
        targetProject = allProjects.find(p => p.id === projectId);
        console.log("Found project from list:", targetProject);
      }

      if (!targetProject) {
        setError("Project not found or you don't have access to it.");
        setProject(null);
        return;
      }

      setProject(targetProject);

      // Load additional data in parallel
      const [settingsList, allUsers] = await Promise.all([
        GlobalSettings.list(),
        User.list()
      ]);

      const memberIds = new Set([targetProject.project_manager_id, ...(targetProject.team_member_ids || [])].filter(Boolean));
      const members = allUsers.filter(u => memberIds.has(u.id));
      setTeamMembers(members);
      
      const settings = settingsList[0] || {
        chat_enabled: true,
        files_enabled: true,
        timeline_enabled: true,
        response_bot_enabled: true,
        testing_enabled: true,
        wiki_enabled: true, // Added wiki_enabled to default settings
      };
      setGlobalSettings(settings);
      
    } catch (error) {
      console.error("Error loading project data:", error);
      setError("Failed to load project data. Please try again.");
      setProject(null);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await User.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    await User.login();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center bg-gray-100">
        <div>
          <h2 className="text-xl font-bold text-red-600 mb-2">{error || "Project not found"}</h2>
          <p className="text-gray-600 mb-4">Project ID: {projectId}</p>
          <Link to={createPageUrl("Dashboard")}>
            <Button>Go back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Dynamic CSS with project accent color
  const projectStyles = `
    .neumorphism-flat {
      background-color: ${project.accent_color || '#f0f0f0'} !important;
    }
    /* Define new utility classes based on accent color for direct usage */
    .bg-accent {
      background-color: ${project.accent_color || '#3b82f6'} !important;
    }
    .text-accent {
      color: ${project.accent_color || '#3b82f6'} !important;
    }
    .border-accent {
      border-color: ${project.accent_color || '#3b82f6'} !important;
    }
    .text-accent-foreground {
      color: white !important; /* Assuming foreground text on accent background should be white */
    }
    .btn-primary {
      background-color: ${project.accent_color || '#3b82f6'} !important;
      color: white !important; /* Assuming primary buttons have white text */
    }
    .btn-primary:hover {
      background-color: ${project.accent_color ? `${project.accent_color}dd` : '#2563eb'} !important; /* Darker hover */
    }
  `;

  const features = project.features_enabled || {};
  const featureCards = [
    {
      id: 'timeline',
      title: 'Timeline',
      icon: ListChecks,
      description: 'Track project milestones and progress',
      enabled: (features.timeline !== false) && (globalSettings?.timeline_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=timeline`)
    },
    {
      id: 'chat',
      title: 'Chat',
      icon: MessageCircle,
      description: 'Communicate with your team in real-time',
      enabled: (features.chat !== false) && (globalSettings?.chat_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=chat`)
    },
    {
      id: 'files',
      title: 'Files',
      icon: FileText,
      description: 'Upload, download and manage project files',
      enabled: (features.files !== false) && (globalSettings?.files_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=files`)
    },
    {
      id: 'bot',
      title: 'Support Bot',
      icon: Bot,
      description: 'Get instant help with AI-powered support',
      enabled: (features.response_bot !== false) && (globalSettings?.response_bot_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=bot`)
    },
    {
      id: 'testing',
      title: 'Testing & Sign-off',
      icon: TestTube,
      description: 'Review and approve project deliverables',
      enabled: (features.testing !== false) && (globalSettings?.testing_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=testing`)
    },
    { // Added Wiki Feature
      id: 'wiki',
      title: 'Wiki',
      icon: BookText,
      description: 'Access project documentation and knowledge base',
      enabled: (features.wiki !== false) && (globalSettings?.wiki_enabled !== false),
      link: createPageUrl(`ClientProjectManage?id=${project.id}&tab=wiki`)
    }
  ].filter(feature => feature.enabled);

  return (
    <div className="min-h-screen bg-gray-100">
      <style>
        {projectStyles}
        {`
          .client-sign-out-button {
            background: var(--neumorphism-bg);
            box-shadow: 6px 6px 12px var(--neumorphism-shadow-dark), 
                       -6px -6px 12px var(--neumorphism-shadow-light);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: var(--text-primary) !important;
            transition: all 0.2s ease;
          }
          
          .client-sign-out-button:hover {
            box-shadow: 8px 8px 16px var(--neumorphism-shadow-dark), 
                       -8px -8px 16px var(--neumorphism-shadow-light);
            color: var(--text-primary) !important;
            transform: scale(1.05);
          }
        `}
      </style>

      {/* Header */}
      <div className="neumorphism-flat border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline" size="icon" className="neumorphism-button border-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-4">
                {project.logo_url ? (
                  <div className="neumorphism p-2 rounded-2xl">
                    <img src={project.logo_url} alt="Logo" className="w-24 h-24 rounded-xl object-cover" />
                  </div>
                ) : (
                  <div className="neumorphism w-24 h-24 rounded-2xl flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-primary">{project.name}</h1>
                  <p className="text-secondary">Project Management Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="neumorphism-flat px-4 py-2 rounded-xl">
                <span className="text-sm font-medium text-success">
                  {project.status?.replace('_', ' ') || 'Active'}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                className="client-sign-out-button border-0 font-medium px-6 py-3 rounded-xl focus-visible"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Project Overview Section */}
        <div className="mb-8">
          <div className="neumorphism rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-3">
              <Info className="w-6 h-6" />
              Project Overview
            </h2>
            <p className="text-secondary leading-relaxed mb-6 whitespace-pre-wrap">
              {project.description || "No description provided."}
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Key Dates */}
              <div className="neumorphism-flat rounded-xl p-6">
                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Key Dates
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-secondary">Start Date</span>
                    <span className="font-bold text-primary">
                      {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-secondary">End Date</span>
                    <span className="font-bold text-primary">
                      {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="neumorphism-flat rounded-xl p-6">
                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Project Team
                </h3>
                <div className="space-y-3">
                  {teamMembers.length > 0 ? (
                    teamMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3">
                        <MemberAvatar user={member} />
                        <div>
                          <p className="font-semibold text-primary text-sm">{member.first_name} {member.last_name}</p>
                          <p className="text-xs text-secondary">{member.title}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-secondary text-sm">Team members will be displayed here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Available Features</h2>
          
          {featureCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="neumorphism-flat p-6 rounded-2xl inline-block mb-4">
                <TestTube className="w-16 h-16 text-muted mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">No features enabled</h3>
              <p className="text-secondary">Contact your project manager to enable features for this project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCards.map((feature) => (
                <Link key={feature.id} to={feature.link}>
                  <Card className="neumorphism-hover transition-all duration-300 transform hover:-translate-y-2 cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-accent-foreground bg-accent"
                        >
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <Badge 
                          variant="outline"
                          className="text-xs font-medium border-accent text-accent"
                        >
                          Available
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-primary">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-secondary text-sm leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="mt-4">
                        <Button 
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium"
                        >
                          Open {feature.title}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
