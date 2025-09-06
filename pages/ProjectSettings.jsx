import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Settings, Palette, ListChecks, TestTube, Users } from "lucide-react";
import ProjectDetailsForm from "../components/settings/ProjectDetailsForm";
import FeatureToggle from "../components/settings/FeatureToggle";
import TimelineSetup from "../components/settings/TimelineSetup";
import TestingSetup from "../components/settings/TestingSetup";
import TeamManagement from "../components/settings/TeamManagement";

export default function ProjectSettings() {
  const location = useLocation();
  const [project, setProject] = useState(location.state?.project || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  const projectId = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    loadProjectAndUser();
  }, [projectId]);

  const loadProjectAndUser = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (!project && projectId) {
        try {
          const projectData = await Project.filter({ id: projectId });
          const targetProject = projectData.length > 0 ? projectData[0] : null;
          setProject(targetProject);
        } catch (error) {
          console.error("Error fetching project:", error);
          setProject(null);
        }
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
    setLoading(false);
  };

  const handleProjectUpdate = (updatedProject) => {
    setProject(updatedProject);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center bg-background p-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Project not found or access denied</h2>
          <p className="text-muted-foreground mb-4">You may not have permission to access this project.</p>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="link">Go back to Dashboard</Button>
          </Link>
        </div>
      </div>);
  }

  const isClient = currentUser?.title === 'Client';

  const tabs = [
  { id: "details", label: "Project Details", icon: Settings, description: "Core project information and branding.", hideForClient: false },
  { id: "team", label: "Team Management", icon: Users, description: "Manage project team and client access.", hideForClient: isClient },
  { id: "features", label: "Feature Access", icon: Palette, description: "Control client-facing features.", hideForClient: isClient },
  { id: "timeline", label: "Timeline Setup", icon: ListChecks, description: "Define project milestones and tasks.", hideForClient: isClient },
  { id: "testing", label: "Testing Setup", icon: TestTube, description: "Configure testing & sign-off cards.", hideForClient: isClient }].
  filter((tab) => !tab.hideForClient);

  const renderContent = () => {
    switch (activeTab) {
      case "details":
        return <ProjectDetailsForm project={project} onUpdate={handleProjectUpdate} />;
      case "team":
        return <TeamManagement project={project} onUpdate={handleProjectUpdate} />;
      case "features":
        return <FeatureToggle project={project} onUpdate={handleProjectUpdate} />;
      case "timeline":
        return <TimelineSetup project={project} />;
      case "testing":
        return <TestingSetup project={project} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-4 h-20">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-4">
                 {project.logo_url ?
              <img src={project.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> :
              <div className="w-12 h-12 rounded-lg bg-primary flex-shrink-0"></div>
              }
                <div>
                    <h1 className="text-xl font-bold text-foreground leading-tight">
                        {project.name} {isClient ? '' : 'Settings'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Project for <span className="font-medium text-foreground/80">{project.client_name}</span>
                    </p>
                </div>
              </div>
            </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-slate-50 text-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-foreground mb-4 px-2">{isClient ? 'Project Information' : 'Configuration'}</h2>
            <div className="space-y-1">
              {tabs.map((tab) =>
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-4 ${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`
                }>

                  <tab.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{tab.label}</span>
                    <p className={`text-sm ${activeTab === tab.id ? 'text-primary/80' : 'text-muted-foreground'}`}>{tab.description}</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-9">
            <div className="bg-card border border-border rounded-lg">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>);
}