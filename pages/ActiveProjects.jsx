
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Settings, Calendar, DollarSign } from "lucide-react";

export default function ActiveProjects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allProjects, allUsers] = await Promise.all([
        Project.filter({ status: 'active' }, '-created_date'),
        User.list()
      ]);
      
      setProjects(allProjects);
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getUserById = (userId) => users.find(u => u.id === userId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Active Projects</h1>
            <p className="text-slate-600">{projects.length} projects currently running</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm text-center py-12">
            <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No active projects</h3>
            <p className="text-slate-500 mb-6">All projects are either completed or on hold</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const projectManager = getUserById(project.project_manager_id);
              const teamMembers = (project.team_member_ids || [])
                .map(id => getUserById(id))
                .filter(Boolean);
              
              return (
                <Card key={project.id} className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {project.logo_url ? (
                        <img
                          src={project.logo_url}
                          alt="Client logo"
                          className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div
                          className="w-24 h-24 rounded-full flex items-center justify-center text-white font-medium text-lg"
                          style={{ backgroundColor: project.accent_color || '#3b82f6' }}
                        >
                          {project.client_name?.[0] || project.name?.[0] || 'P'}
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900">{project.client_name || 'Client'}</CardTitle>
                        <p className="text-sm text-slate-600 font-medium">{project.name}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500">Manager</span>
                          <span className="font-medium text-right">
                            {projectManager ? `${projectManager.first_name} ${projectManager.last_name}` : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-start">
                          <span className="text-slate-500 pt-1">Team</span>
                          <div className="flex -space-x-2 overflow-hidden justify-end">
                            {teamMembers.slice(0, 3).map(member => (
                               <div key={member.id} title={`${member.first_name} ${member.last_name}`} className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                 {member.first_name?.[0]}{member.last_name?.[0]}
                               </div>
                            ))}
                            {teamMembers.length > 3 && (
                              <div className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                                +{teamMembers.length - 3}
                              </div>
                            )}
                            {teamMembers.length === 0 && <span className="text-xs text-slate-400 italic mt-1">No team members</span>}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Start Date</span>
                          <span className="font-medium">
                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">End Date</span>
                          <span className="font-medium">
                            {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Value</span>
                          <span className="font-medium">
                            {project.value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(project.value) : 'Not set'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-3">
                        <Link to={createPageUrl(`ProjectSettings?id=${project.id}`)}>
                          <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Manage Project
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
