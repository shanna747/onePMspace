
import React from "react";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import ProjectListDashboard from "../components/dashboard/ProjectListDashboard";

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUserAndProjects();
  }, []);

  const loadUserAndProjects = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      console.log("🔍 Current user loaded:", currentUser);
      setUser(currentUser);

      // Fetch all projects
      const allProjects = await Project.list('-created_date');
      console.log("📋 Fetched all projects from DB:", allProjects);
      
      let visibleProjects = allProjects;

      // Filter projects based on user role and assignments
      if (currentUser.role === 'admin' || currentUser.title === 'Admin') {
        // Admins see all projects
        visibleProjects = allProjects;
        console.log("👑 Admin user - showing all projects");
      } else if (currentUser.title === 'Project Manager') {
        // Project Managers see ONLY projects they are assigned to
        visibleProjects = allProjects.filter(project => {
          const isAssignedViaIds = project.project_manager_ids && project.project_manager_ids.includes(currentUser.id);
          const isAssignedViaLegacyId = project.project_manager_id === currentUser.id;
          const isAssigned = isAssignedViaIds || isAssignedViaLegacyId;
          
          if (isAssigned) {
            console.log(`✅ Project Manager assigned to project: ${project.name}`, {
              projectId: project.id,
              pmIds: project.project_manager_ids,
              legacyPmId: project.project_manager_id,
              userId: currentUser.id
            });
          }
          
          return isAssigned;
        });
        
        console.log(`📊 Project Manager sees ${visibleProjects.length} assigned projects out of ${allProjects.length} total`);
      } else if (currentUser.title === 'Client') {
        // Clients see ONLY projects they are assigned to (either as client or team member)
        visibleProjects = allProjects.filter(project => {
          const isClientId = project.client_id === currentUser.id;
          const isClientEmail = project.client_email === currentUser.email;
          const isAdditionalClient = project.additional_client_ids && project.additional_client_ids.includes(currentUser.id);
          const isTeamMember = project.team_member_ids && project.team_member_ids.includes(currentUser.id);
          const isAssigned = isClientId || isClientEmail || isAdditionalClient || isTeamMember;
          
          console.log(`🔍 Checking project "${project.name}" for client:`, {
            projectId: project.id,
            clientId: project.client_id,
            clientEmail: project.client_email,
            additionalClientIds: project.additional_client_ids,
            teamMemberIds: project.team_member_ids,
            currentUserId: currentUser.id,
            currentUserEmail: currentUser.email,
            isClientId,
            isClientEmail,
            isAdditionalClient,
            isTeamMember,
            isAssigned
          });
          
          if (isAssigned) {
            const assignmentType = isTeamMember ? 'team member' : 'client';
            console.log(`✅ Client assigned to project "${project.name}" as ${assignmentType}`);
          }
          
          return isAssigned;
        });
        console.log(`👤 Client sees ${visibleProjects.length} assigned projects out of ${allProjects.length} total`);
      } else if (currentUser.title === 'Team Member') {
        // Team members see ONLY projects they are assigned to
        visibleProjects = allProjects.filter(project => {
          const isAssigned = project.team_member_ids && project.team_member_ids.includes(currentUser.id);
          
          if (isAssigned) {
            console.log(`✅ Team Member assigned to project: ${project.name}`, {
              projectId: project.id,
              teamMemberIds: project.team_member_ids,
              userId: currentUser.id
            });
          }
          
          return isAssigned;
        });
        console.log(`👥 Team Member sees ${visibleProjects.length} assigned projects out of ${allProjects.length} total`);
      } else {
        // Unknown role - no projects
        visibleProjects = [];
        console.log("❌ Unknown user role - showing no projects");
      }
      
      console.log(`🎯 Final visible projects: ${visibleProjects.length}`);
      setProjects(visibleProjects);

    } catch (error) {
      console.error("❌ Error loading data:", error);
      setProjects([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Unable to load user data</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Show AdminDashboard for users with role="admin" OR title="Admin"
  // Show ProjectListDashboard for everyone else (including Project Managers)
  return (
    <div className="min-h-screen">
      {(user.role === 'admin' || user.title === 'Admin') ? (
        <AdminDashboard user={user} projects={projects} onRefresh={loadUserAndProjects} />
      ) : (
        <ProjectListDashboard user={user} projects={projects} onRefresh={loadUserAndProjects} />
      )}
    </div>
  );
}
