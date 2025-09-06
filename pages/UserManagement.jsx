
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Project } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allUsers, allProjects] = await Promise.all([User.list(), Project.list()]);
        // Filter out users with the title "Team Member"
        const filteredUsers = allUsers.filter((user) => user.title !== 'Team Member');
        setUsers(filteredUsers);
        setProjects(allProjects);
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getUserProjectCount = (userId, userTitle) => {
    if (userTitle === 'Project Manager') {
      return projects.filter(p => (p.project_manager_ids && p.project_manager_ids.includes(userId)) || p.project_manager_id === userId).length;
    }
    if (userTitle === 'Client') {
      const userEmail = users.find((u) => u.id === userId)?.email;
      return projects.filter((p) => p.client_id === userId || p.client_email === userEmail).length;
    }
    if (userTitle === 'Team Member') {
      return projects.filter((p) => p.team_member_ids && p.team_member_ids.includes(userId)).length;
    }
    return 0;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">View and manage platform users.</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>{users.length} users found in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) =>
                <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">{user.full_name || `${user.first_name} ${user.last_name}`}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className='text-stone-50'>{user.title || user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium text-foreground">{getUserProjectCount(user.id, user.title)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>);
}
