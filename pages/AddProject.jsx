
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Project } from "@/api/entities";
import { TimelineItem } from "@/api/entities";
import { TestingCard } from "@/api/entities";
import { TimelineTemplateItem } from "@/api/entities";
import { TimelineTemplate } from "@/api/entities";
import { User } from "@/api/entities";
import { GlobalSettings } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Users, Palette, Check, ChevronsUpDown, ListChecks, MessageCircle, FileText, TestTube, Bot, Plus, UserPlus } from "lucide-react";

const MemberAvatar = ({ user }) =>
<div
  className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background"
  title={user ? `${user.first_name} ${user.last_name}` : '...'}>
    {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '?'}
  </div>;


export default function AddProject() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    first_name: '',
    last_name: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    accent_color: '#0deccb', // Changed default accent color
    value: ''
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const [features, setFeatures] = useState({
    chat: false,
    timeline: false,
    response_bot: false,
    testing: false,
    files: false
  });
  const [teamMemberIds, setTeamMemberIds] = useState(() => new Set()); // Fixed: Initializing Set with a function for useState
  const [allUsers, setAllUsers] = useState([]);
  const [allSystemUsers, setAllSystemUsers] = useState([]); // To hold all users for lookups
  const [projectManagers, setProjectManagers] = useState([]);
  const [selectedPmIds, setSelectedPmIds] = useState(new Set()); // Changed to Set for multiple PMs
  const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
  const [isPmPopoverOpen, setIsPmPopoverOpen] = useState(false); // Added for PM popover
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState(null); // Changed default to null for no template
  const [availableTemplates, setAvailableTemplates] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const user = await User.me();
    setCurrentUser(user);

    // Allow both admins and project managers to access this page
    const isAdmin = user.role === 'admin' || user.title === 'Admin';
    const isProjectManager = user.title === 'Project Manager';

    if (!isAdmin && !isProjectManager) {
      window.location.href = createPageUrl('Dashboard');
      return;
    }
    
    // Load essential data first
    const [settingsList, templates] = await Promise.all([
        GlobalSettings.list(),
        TimelineTemplate.filter({ is_active: true }, 'name')
    ]);
    
    if (settingsList.length > 0) {
      setGlobalSettings(settingsList[0]);
    } else {
      setGlobalSettings({
        chat_enabled: true,
        files_enabled: true,
        timeline_enabled: true,
        response_bot_enabled: true,
        testing_enabled: true
      });
    }

    setAvailableTemplates(templates);
    const defaultTemplate = templates.find(t => t.is_default);
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
    }
    
    // Attempt to load user data, but don't fail the page if it's not permitted
    try {
        const allUsersList = await User.list();
        setAllSystemUsers(allUsersList); // Store the complete user list

        // Filter to show eligible users for team selection
        const teamUsers = allUsersList.filter((u) =>
        u.title === 'Project Manager' || u.title === 'Client' || u.title === 'Team Member'
        );
        setAllUsers(teamUsers);

        const pms = allUsersList.filter((u) => u.title === 'Project Manager');
        setProjectManagers(pms);
    } catch (error) {
        console.warn("Could not load user list for assignments:", error);
        // Continue without user list. Assignment features will be disabled.
        setAllUsers([]);
        setProjectManagers([]);
    }

    // Auto-assign current user if they are a Project Manager
    if (user.title === 'Project Manager') {
      setSelectedPmIds(new Set([user.id]));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFeatureToggle = (feature) => {
    // Check if the feature is globally disabled
    const globalKey = `${feature}_enabled`;
    if (globalSettings && !globalSettings[globalKey]) {
      // Don't allow enabling if globally disabled
      return;
    }
    setFeatures((prev) => ({ ...prev, [feature]: !prev[feature] }));
  };

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
    const newSet = new Set(selectedPmIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedPmIds(newSet);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalPmIds = new Set(selectedPmIds);
    // Auto-add current user if they are a Project Manager
    if (currentUser?.title === 'Project Manager') {
      finalPmIds.add(currentUser.id);
    }

    const finalPmIdArray = Array.from(finalPmIds);

    if (finalPmIdArray.length === 0) {
      alert("Please select at least one Project Manager to assign to this project.");
      setLoading(false);
      return;
    }

    try {
      let logoUrl = '';
      if (logo) {
        const result = await UploadFile({ file: logo });
        logoUrl = result.file_url;
      }

      const selectedTeamIds = Array.from(teamMemberIds);
      const teamMembersInfo = allUsers.
      filter((user) => selectedTeamIds.includes(user.id)).
      map((u) => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, title: u.title }));

      // Get full info for selected Project Managers
      const projectManagersInfo = allSystemUsers
        .filter(user => finalPmIdArray.includes(user.id))
        .map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name }));

      // Create the project first
      const project = await Project.create({
        name: formData.name,
        description: formData.description,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_first_name: formData.first_name,
        client_last_name: formData.last_name,
        project_manager_ids: finalPmIdArray, // Changed to array of IDs
        project_managers_info: projectManagersInfo, // Changed to array of info objects
        start_date: formData.start_date,
        end_date: formData.end_date,
        accent_color: formData.accent_color,
        value: parseFloat(formData.value) || 0,
        logo_url: logoUrl,
        features_enabled: features,
        team_member_ids: selectedTeamIds,
        team_members_info: teamMembersInfo,
        status: 'active'
      });

      // Now that project is created and has an ID, create timeline items from selected template
      if (selectedTemplateId) {
        const templates = await TimelineTemplateItem.filter({ template_id: selectedTemplateId }, 'order');
        const startDate = new Date(formData.start_date || new Date());

        if (templates.length > 0) {
          const templateIdToNewItemIdMap = new Map();
          const createdTimelineItems = [];

          // First pass: create all items without parent_id to get their new IDs
          for (const template of templates) {
            const dueDate = new Date(startDate);
            // Add default_offset_days, handling potential null/undefined for default_offset_days
            dueDate.setDate(dueDate.getDate() + (template.default_offset_days || 0));

            const newItemData = {
              project_id: project.id,
              title: template.title,
              description: template.description,
              due_date: dueDate.toISOString().split('T')[0], // Format to YYYY-MM-DD
              is_completed: false,
              order: template.order
            };

            const createdItem = await TimelineItem.create(newItemData);
            templateIdToNewItemIdMap.set(template.id, createdItem.id);
            createdTimelineItems.push({ ...createdItem, templateParentId: template.parent_id });
          }

          // Second pass: update the created items with the correct parent_id
          const updatePromises = [];
          for (const item of createdTimelineItems) {
            if (item.templateParentId && templateIdToNewItemIdMap.has(item.templateParentId)) {
              const newParentId = templateIdToNewItemIdMap.get(item.templateParentId);
              updatePromises.push(TimelineItem.update(item.id, { parent_id: newParentId }));
            }
          }

          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        }
      }

      // Create default testing card
      await TestingCard.create({
        project_id: project.id,
        title: "Design Review",
        description: "Please review and approve the initial designs",
        is_completed: false,
        order: 0
      });

      // Redirect to dashboard
      window.location.href = createPageUrl('Dashboard');

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project. Please try again.");
    }
    setLoading(false);
  };

  const featureList = [
    { id: 'timeline', label: 'Timeline', icon: ListChecks },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'files', label: 'File Sharing', icon: FileText },
    { id: 'testing', label: 'Testing & Sign-off', icon: TestTube },
    { id: 'response_bot', label: 'AI Support Bot', icon: Bot }
  ];


  const teamMembers = allUsers.filter((user) => teamMemberIds.has(user.id));
  const assignedPms = projectManagers.filter(pm => selectedPmIds.has(pm.id));
  const selectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Add Space</h1>
            <p className="text-muted-foreground">Create a new space for client collaboration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => handleChange('client_name', e.target.value)}
                    placeholder="Acme Corp"
                    required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      placeholder="John"
                      required />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      placeholder="Doe"
                      required />
                  </div>
                </div>

                <div>
                  <Label>Client Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => handleChange('client_email', e.target.value)}
                    placeholder="client@acme.com"
                    required />
                </div>
              </CardContent>
            </Card>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                  <Label>Project Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Website Redesign"
                    required />
                </div>

                {/* Timeline Template Selection */}
                {availableTemplates.length > 0 && (
                  <div>
                    <Label>Timeline Template</Label>
                    <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isTemplatePopoverOpen}
                          className="w-full justify-between mt-2 font-normal"
                        >
                          {selectedTemplate ? (
                             <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: selectedTemplate.color || '#ccc' }}
                              />
                              <span>{selectedTemplate.name}</span>
                            </div>
                          ) : (
                            "Select a template..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search templates..." />
                          <CommandList>
                            <CommandEmpty>No template found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setSelectedTemplateId(null);
                                  setIsTemplatePopoverOpen(false);
                                }}
                              >
                                No Template (Start from scratch)
                              </CommandItem>
                              {availableTemplates.map((template) => (
                                <CommandItem
                                  key={template.id}
                                  value={template.name}
                                  onSelect={() => {
                                    setSelectedTemplateId(template.id);
                                    setIsTemplatePopoverOpen(false);
                                  }}
                                >
                                  <div className="w-full">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: template.color || '#ccc' }}
                                      />
                                      <span className="font-medium">{template.name}</span>
                                      {template.is_default && (
                                        <Badge variant="secondary" className="text-xs ml-auto">Default</Badge>
                                      )}
                                    </div>
                                    {template.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {template.description}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div>
                  <Label>Client Logo</Label>
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange} />

                    {logoPreview &&
                    <div className="flex items-center gap-3">
                        <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-24 h-24 rounded-lg object-cover" />

                        <span className="text-sm text-muted-foreground">Logo preview</span>
                      </div>
                    }
                  </div>
                </div>

                <div>
                  <Label>Assign Project Managers</Label>
                  <Popover open={isPmPopoverOpen} onOpenChange={setIsPmPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isPmPopoverOpen} className="w-full justify-between mt-2 h-auto min-h-[44px]">
                        <div className="flex gap-2 flex-wrap items-center">
                          {assignedPms.length > 0 ?
                          assignedPms.map((member) =>
                          <div key={member.id} className="flex items-center gap-2 bg-secondary rounded-full pr-3">
                                <MemberAvatar user={member} />
                                <span className="text-sm font-medium text-secondary-foreground">{member.first_name} {member.last_name}</span>
                              </div>
                          ) :
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
                            {projectManagers.map((user) =>
                            <CommandItem
                              key={user.id}
                              onSelect={() => handlePmSelectionChange(user.id)}
                              className="flex items-center gap-3 cursor-pointer">

                                <div className={`w-4 h-4 flex items-center justify-center`}>
                                  {selectedPmIds.has(user.id) && <Check className="h-4 w-4 text-primary" />}
                                </div>
                                <MemberAvatar user={user} />
                                <div>
                                  <p>{user.first_name} {user.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{user.title}</p>
                                </div>
                              </CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Brief description of the project scope and goals..."
                    rows={3} />

                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)} />

                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)} />

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project Value</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={formData.value}
                        onChange={(e) => handleChange('value', e.target.value)}
                        placeholder="5000"
                        className="pl-7" />

                    </div>
                  </div>
                  <div>
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => handleChange('accent_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded" />

                      <Input
                        value={formData.accent_color}
                        onChange={(e) => handleChange('accent_color', e.target.value)}
                        placeholder="#0deccb"
                        className="flex-1" />

                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> Team Management
                </CardTitle>
                <CardDescription>Assign existing team members. New members must be invited by an admin first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Assign Team Members</Label>
                  <Popover open={isTeamPopoverOpen} onOpenChange={setIsTeamPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isTeamPopoverOpen} className="w-full justify-between mt-2 h-auto min-h-[44px]">
                        <div className="flex gap-2 flex-wrap items-center">
                          {teamMembers.length > 0 ?
                          teamMembers.map((member) =>
                          <div key={member.id} className="flex items-center gap-2 bg-secondary rounded-full pr-3">
                                <MemberAvatar user={member} />
                                <span className="text-sm font-medium text-secondary-foreground">{member.first_name} {member.last_name}</span>
                                <span className="text-xs text-muted-foreground">({member.title})</span>
                              </div>
                          ) :

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
                          <CommandEmpty>No team members found.</CommandEmpty>
                          <CommandGroup>
                            {allUsers.map((user) =>
                            <CommandItem
                              key={user.id}
                              onSelect={() => handleTeamSelectionChange(user.id)}
                              className="flex items-center gap-3 cursor-pointer">

                                <div className={`w-4 h-4 flex items-center justify-center`}>
                                  {teamMemberIds.has(user.id) && <Check className="h-4 w-4 text-primary" />}
                                </div>
                                <MemberAvatar user={user} />
                                <div>
                                  <p>{user.first_name} {user.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{user.title}</p>
                                </div>
                              </CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Feature Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Feature Access
                </CardTitle>
                <CardDescription>
                  Control which features are visible to the client on their project dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {featureList.map((feature) => {
                    const isGloballyDisabled = globalSettings && !globalSettings[`${feature.id}_enabled`];
                    return (
                      <div key={feature.id} className="p-4 flex items-center justify-between rounded-lg hover:bg-secondary">
                        <div className="flex items-start gap-4">
                          <feature.icon className="w-6 h-6 text-muted-foreground mt-1" />
                          <div>
                            <Label htmlFor={feature.id} className="text-base font-medium">
                              {feature.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {feature.id === 'timeline' && 'Client can view project milestones and progress.'}
                              {feature.id === 'chat' && 'Enable real-time messaging with the client.'}
                              {feature.id === 'files' && 'Allow file uploads and downloads for this project.'}
                              {feature.id === 'testing' && 'Client can review and sign off on test cases.'}
                              {feature.id === 'response_bot' && 'Provide an AI assistant for automated support.'}
                            </p>
                            {isGloballyDisabled &&
                            <p className="text-xs text-destructive mt-1">This feature is disabled globally by an administrator.</p>
                            }
                          </div>
                        </div>
                        <div className="relative">
                          <Switch
                            id={feature.id}
                            checked={isGloballyDisabled ? false : !!features[feature.id]}
                            onCheckedChange={() => handleFeatureToggle(feature.id)}
                            disabled={isGloballyDisabled} />
                        </div>
                      </div>);
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-8">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}>

              {loading ?
              <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div> :

              <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Create Space
                </div>
              }
            </Button>
          </div>
        </form>
      </div>
    </div>);
}
