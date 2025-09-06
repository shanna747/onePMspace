
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Mail, FolderOpen } from "lucide-react";

export default function ProjectManagersList() {
  const [projectManagers, setProjectManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allUsers, allProjects] = await Promise.all([
      User.list(),
      Project.list()]
      );

      const pms = allUsers.filter((u) => u.title === 'Project Manager');
      setProjectManagers(pms);
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getProjectsForPM = (pmId) => {
    return projects.filter((p) => p.project_manager_id === pmId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="text-purple-600 border-purple-600 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Project Managers</h1>
            <p className="text-slate-600">Manage your team of project managers</p>
          </div>
        </div>

        {projectManagers.length === 0 ?
        <Card className="bg-slate-50 text-center py-12 rounded-lg border-0 shadow-xl backdrop-blur-sm">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No project managers found</h3>
            <p className="text-slate-500 mb-6">Add your first project manager to get started</p>
          </Card> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectManagers.map((pm) => {
            const pmProjects = getProjectsForPM(pm.id);
            const activeProjects = pmProjects.filter((p) => p.status === 'active');

            return (
              <Card key={pm.id} className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {pm.first_name?.[0] || pm.full_name?.[0] || 'PM'}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pm.first_name} {pm.last_name}</CardTitle>
                        <p className="text-sm text-slate-500">Project Manager</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {pm.email}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-600">Projects</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {activeProjects.length} Active
                        </Badge>
                        <Badge variant="secondary">
                          {pmProjects.length} Total
                        </Badge>
                      </div>
                    </div>

                    {pmProjects.length > 0 &&
                  <div>
                        <p className="text-xs text-slate-500 mb-2">Recent Projects:</p>
                        <div className="space-y-1">
                          {pmProjects.slice(0, 3).map((project) =>
                      <div key={project.id} className="text-sm text-slate-700 truncate">
                              • {project.name}
                            </div>
                      )}
                          {pmProjects.length > 3 &&
                      <div className="text-xs text-slate-400">
                              +{pmProjects.length - 3} more...
                            </div>
                      }
                        </div>
                      </div>
                  }
                  </CardContent>
                </Card>);

          })}
          </div>
        }
      </div>
    </div>);

}
