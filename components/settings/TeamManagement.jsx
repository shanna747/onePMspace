
import React, { useState, useEffect } from 'react';
import { Project } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Users, UserCheck } from 'lucide-react';
import { Label } from "@/components/ui/label"; // Added this import
import { toast } from '@/components/ui/use-toast';

const MemberAvatar = ({ user }) => (
  <div
    className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background"
    title={user ? `${user.first_name} ${user.last_name}` : '...'}
  >
    {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '?'}
  </div>
);

export default function TeamManagement({ project, onUpdate }) {
  const [teamMemberIds, setTeamMemberIds] = useState(new Set());
  const [pmIds, setPmIds] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
  const [isPmPopoverOpen, setIsPmPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setTeamMemberIds(new Set(project.team_member_ids || []));
      setPmIds(new Set(project.project_manager_ids || []));
    }
  }, [project]);

  useEffect(() => {
    const loadUsers = async () => {
      const users = await User.list();
      const teamUsers = users.filter((u) => u.title === 'Project Manager' || u.title === 'Client' || u.title === 'Team Member');
      const pms = users.filter((u) => u.title === 'Project Manager');
      setAllUsers(teamUsers);
      setProjectManagers(pms);
    };
    loadUsers();
  }, []);

  const handleTeamSelectionChange = (userId) => {
    const newSet = new Set(teamMemberIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setTeamMemberIds(newSet);
  };
  
  const handlePmSelectionChange = (userId) => {
    const newSet = new Set(pmIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setPmIds(newSet);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const teamIds = Array.from(teamMemberIds);
      const teamInfo = allUsers.filter(u => teamIds.includes(u.id)).map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, title: u.title }));

      const managerIds = Array.from(pmIds);
      const managerInfo = projectManagers.filter(u => managerIds.includes(u.id)).map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name }));

      const updatedProject = await Project.update(project.id, {
        team_member_ids: teamIds,
        team_members_info: teamInfo,
        project_manager_ids: managerIds,
        project_managers_info: managerInfo
      });
      onUpdate(updatedProject);
      toast({ title: 'Team Updated', description: 'Project team members and managers have been updated.' });
    } catch (error) {
      console.error('Error updating team:', error);
      toast({ title: 'Error', description: 'Failed to update team.', variant: 'destructive' });
    }
    setLoading(false);
  };
  
  const selectedTeamMembers = allUsers.filter(u => teamMemberIds.has(u.id));
  const selectedPms = projectManagers.filter(u => pmIds.has(u.id));

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="w-6 h-6" /> Team & Access
        </CardTitle>
        <CardDescription>
          Manage project managers and team members for this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* PM Management */}
        <div className="space-y-2">
          <Label className="font-semibold text-base">Project Managers</Label>
          <p className="text-sm text-muted-foreground">Assign one or more project managers.</p>
          <Popover open={isPmPopoverOpen} onOpenChange={setIsPmPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={isPmPopoverOpen} className="w-full justify-between mt-2 h-auto min-h-[44px]">
                <div className="flex gap-2 flex-wrap items-center">
                  {selectedPms.length > 0 ?
                    selectedPms.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-secondary rounded-full pr-3">
                        <MemberAvatar user={member} />
                        <span className="text-sm font-medium text-secondary-foreground">{member.first_name} {member.last_name}</span>
                      </div>
                    )) :
                    <span className="text-muted-foreground">Select project managers...</span>
                  }
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search project managers..." />
                <CommandList>
                  <CommandEmpty>No project managers found.</CommandEmpty>
                  <CommandGroup>
                    {projectManagers.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handlePmSelectionChange(user.id)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className={`w-4 h-4 flex items-center justify-center`}>
                          {pmIds.has(user.id) && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <MemberAvatar user={user} />
                        <div>
                          <p>{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground">{user.title}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Team Member Management */}
        <div className="space-y-2">
          <Label className="font-semibold text-base">Team Members</Label>
          <p className="text-sm text-muted-foreground">Assign clients and internal team members.</p>
          <Popover open={isTeamPopoverOpen} onOpenChange={setIsTeamPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={isTeamPopoverOpen} className="w-full justify-between mt-2 h-auto min-h-[44px]">
                <div className="flex gap-2 flex-wrap items-center">
                  {selectedTeamMembers.length > 0 ?
                    selectedTeamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-secondary rounded-full pr-3">
                        <MemberAvatar user={member} />
                        <span className="text-sm font-medium text-secondary-foreground">{member.first_name} {member.last_name}</span>
                        <span className="text-xs text-muted-foreground">({member.title})</span>
                      </div>
                    )) :
                    <span className="text-muted-foreground">Select team members...</span>
                  }
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search team members..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {allUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleTeamSelectionChange(user.id)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className={`w-4 h-4 flex items-center justify-center`}>
                          {teamMemberIds.has(user.id) && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <MemberAvatar user={user} />
                        <div>
                          <p>{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground">{user.title}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </>
  );
}
