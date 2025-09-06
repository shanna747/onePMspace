
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, DollarSign, Building2, Mail, Phone, MapPin, Users } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";

export default function ProjectOverview({ project, user }) {
  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project information not available.</p>
      </div>
    );
  }

  const getProjectStatus = () => {
    if (project.status === 'completed') return { label: 'Completed', color: 'bg-green-500' };
    if (project.status === 'on_hold') return { label: 'On Hold', color: 'bg-yellow-500' };
    if (project.status === 'archived') return { label: 'Archived', color: 'bg-gray-500' };
    
    // Check if project is overdue
    if (project.end_date && isAfter(new Date(), new Date(project.end_date))) {
      return { label: 'Overdue', color: 'bg-red-500' };
    }
    
    return { label: 'Active', color: 'bg-green-500' };
  };

  const status = getProjectStatus();
  const projectManagers = project.project_managers_info || [];
  const teamMembers = project.team_members_info || [];
  
  // Only show project value to admins and project managers
  // Assuming user has a 'role' property (e.g., 'admin', 'client', 'employee')
  // and 'title' property for specific roles like 'Project Manager'
  const canViewProjectValue = user && (user.role === 'admin' || user.title === 'Project Manager');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={`${status.color} text-white`}>
                  {status.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="font-semibold text-foreground">{project.client_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Manager{projectManagers.length > 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  {projectManagers.length > 0 ? (
                    <div className="space-y-1">
                      {projectManagers.map((pm) => (
                        <p key={pm.id} className="font-semibold text-foreground">
                          {pm.first_name} {pm.last_name}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Not assigned</span>
                  )}
                </div>
              </div>
            </div>

            {project.value && canViewProjectValue && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Value</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(project.value)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No team members assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Description */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
