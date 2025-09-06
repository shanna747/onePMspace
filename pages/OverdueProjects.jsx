
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Settings, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function OverdueProjects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allProjects, allUsers] = await Promise.all([
      Project.list('-created_date'),
      User.list()]
      );

      // Filter overdue projects (active projects past their end date)
      const overdueProjects = allProjects.filter((p) =>
      p.end_date &&
      new Date(p.end_date) < new Date() &&
      p.status === 'active'
      );

      setProjects(overdueProjects);
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getUserById = (userId) => users.find((u) => u.id === userId);

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
            <Button variant="outline" size="icon" className="bg-purple-600 text-sm font-medium gap-2 whitespace-nowrap ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground border-purple-600 hover:bg-purple-50 h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Overdue Projects</h1>
            <p className="text-slate-600">{projects.length} projects past their end date</p>
          </div>
        </div>

        {projects.length === 0 ?
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm text-center py-12">
            <AlertTriangle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No overdue projects</h3>
            <p className="text-slate-500 mb-6">All active projects are on track!</p>
          </Card> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
            const projectManager = getUserById(project.project_manager_id);
            const teamMembers = (project.team_member_ids || []).
            map((id) => getUserById(id)).
            filter(Boolean);
            const daysOverdue = Math.ceil((new Date() - new Date(project.end_date)) / (1000 * 60 * 60 * 24));

            return (
              <Card key={project.id} className="bg-slate-950 text-card-foreground rounded-lg border-0 shadow-xl backdrop-blur-sm hover:shadow-2xl transition-all duration-300 border-l-4 border-l-red-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {project.logo_url ?
                    <img
                      src={project.logo_url}
                      alt="Client logo"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" /> :


                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-medium text-lg"
                      style={{ backgroundColor: project.accent_color || '#3b82f6' }}>

                          {project.client_name?.[0] || project.name?.[0] || 'P'}
                        </div>
                    }
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900">{project.client_name || 'Client'}</CardTitle>
                        <p className="text-sm text-slate-600 font-medium">{project.name}</p>
                      </div>
                      <Badge className="bg-slate-950 text-red-800 px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-primary/80 border-red-200">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.description &&
                    <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
                    }
                      
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
                            {teamMembers.slice(0, 3).map((member) =>
                          <div key={member.id} title={`${member.first_name} ${member.last_name}`} className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                 {member.first_name?.[0]}{member.last_name?.[0]}
                               </div>
                          )}
                            {teamMembers.length > 3 &&
                          <div className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                                +{teamMembers.length - 3}
                              </div>
                          }
                            {teamMembers.length === 0 && <span className="text-xs text-slate-400 italic mt-1">No team members</span>}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Due Date</span>
                          <span className="font-medium text-red-600">
                            {format(new Date(project.end_date), 'MMM d, yyyy')}
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
                          <Button className="bg-rose-700 text-slate-900 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md w-full hover:bg-red-700" size="sm">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Urgent - Manage Project
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>);

          })}
          </div>
        }
      </div>
    </div>);

}
