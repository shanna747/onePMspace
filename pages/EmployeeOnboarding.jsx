import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { ReferenceModule } from '@/api/entities/ReferenceModule';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, CalendarDays, Plus, Archive, Edit, Users, Trash2 } from 'lucide-react';

const initialWeek1Checklist = [
{ id: 'hr', text: 'Complete HR paperwork and benefits enrollment', completed: true },
{ id: 'workspace', text: 'Set up your physical and digital workspace (computer, software, accounts)', completed: true },
{ id: 'intro', text: 'Introduction to key team members and stakeholders', completed: false }];


const initialWeek2Checklist = [
{ id: 'systems', text: 'Training on internal systems (communication, project management)', completed: false },
{ id: 'first_task', text: 'Receive and understand your first small assignment', completed: false }];


const initial90DayPlan = {
  'days1-30': {
    title: 'Focus: Learning & Immersion',
    items: [
    'Understand the company mission, values, and culture.',
    'Learn the core products, services, and customer base.',
    'Build relationships with your immediate team and manager.',
    'Complete all initial training modules.'],

    completed: false
  },
  'days31-60': {
    title: 'Focus: Contribution & Collaboration',
    items: [
    'Begin taking ownership of smaller tasks and projects.',
    'Actively participate in team meetings and discussions.',
    'Seek feedback on your performance and identify areas for growth.',
    'Collaborate with cross-functional team members on a small project.'],

    completed: false
  },
  'days61-90': {
    title: 'Focus: Initiative & Independence',
    items: [
    'Work more independently on your core responsibilities.',
    'Proactively identify areas for improvement in processes or projects.',
    'Start contributing to longer-term goals.',
    'Set performance goals for the next quarter with your manager.'],

    completed: false
  }
};

export default function EmployeeOnboarding() {
  const [user, setUser] = useState(null);
  const [projectManagers, setProjectManagers] = useState([]);
  const [selectedPMId, setSelectedPMId] = useState('');
  const [selectedPM, setSelectedPM] = useState(null);
  const [week1Checklist, setWeek1Checklist] = useState(initialWeek1Checklist);
  const [week2Checklist, setWeek2Checklist] = useState(initialWeek2Checklist);
  const [isAddingWeek1Item, setIsAddingWeek1Item] = useState(false);
  const [isAddingWeek2Item, setIsAddingWeek2Item] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [planData, setPlanData] = useState(initial90DayPlan);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanTitle, setEditPlanTitle] = useState('');
  const [editPlanItems, setEditPlanItems] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const loadSelectedPMData = async () => {
      try {
        // Find the selected PM from the list, or use the current user if they are a PM and selected themselves
        const pm = projectManagers.find((p) => p.id === selectedPMId) || (user && user.id === selectedPMId ? user : null);

        if (pm) {
          setSelectedPM(pm);
          // Load PM's onboarding data from their user record
          if (pm.onboarding_data) {
            const data = pm.onboarding_data;
            setWeek1Checklist(data.week1Checklist || initialWeek1Checklist);
            setWeek2Checklist(data.week2Checklist || initialWeek2Checklist);
            setPlanData(data.planData || initial90DayPlan);
          } else {
            // Reset to initial state for new PM or if no data exists
            setWeek1Checklist(initialWeek1Checklist);
            setWeek2Checklist(initialWeek2Checklist);
            setPlanData(initial90DayPlan);
          }
        } else {
          // No PM selected or found, reset selectedPM and data
          setSelectedPM(null);
          setWeek1Checklist(initialWeek1Checklist);
          setWeek2Checklist(initialWeek2Checklist);
          setPlanData(initial90DayPlan);
        }
      } catch (error) {
        console.error("Error loading PM data:", error);
      }
    };

    // Only load if a PM is explicitly selected (or if the user themselves is a PM and loading their own)
    if (selectedPMId || user && user.title === 'Project Manager' && user.id === selectedPMId) {
      loadSelectedPMData();
    }
  }, [selectedPMId, projectManagers, user]); // Added projectManagers and user to dependencies

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      
      // Redirect if user is not authorized
      if (currentUser.role !== 'admin' && currentUser.title !== 'Project Manager') {
        window.location.href = createPageUrl('Dashboard');
        return;
      }
      
      setUser(currentUser);

      // If admin, load all project managers
      if (currentUser.role === 'admin') {
        const allUsers = await User.list();
        const pms = allUsers.filter((u) => u.title === 'Project Manager');
        setProjectManagers(pms);
        // Optionally pre-select the first PM if there are any
        if (pms.length > 0) {
          setSelectedPMId(pms[0].id);
        }
      } else if (currentUser.title === 'Project Manager') {
        // If PM, set themselves as selected
        setSelectedPMId(currentUser.id);
        setSelectedPM(currentUser);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      window.location.href = createPageUrl('Dashboard'); // Also redirect on error
    }
  };

  const saveOnboardingData = async () => {
    if (!selectedPM) return;

    try {
      const onboardingData = {
        week1Checklist,
        week2Checklist,
        planData
      };

      await User.update(selectedPM.id, { onboarding_data: onboardingData });
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    }
  };

  const toggleChecklistItem = async (week, id) => {
    // Only allow admin or the PM themselves to modify
    const canModify = user?.role === 'admin' || user?.title === 'Project Manager' && user?.id === selectedPM?.id;
    if (!canModify) return;

    if (week === 1) {
      const updated = week1Checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
      );
      setWeek1Checklist(updated);
    } else {
      const updated = week2Checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
      );
      setWeek2Checklist(updated);
    }

    // Save to selected PM's record
    setTimeout(saveOnboardingData, 500);
  };

  const togglePlanCompletion = async (planKey) => {
    // Only allow admin or the PM themselves to modify
    const canModify = user?.role === 'admin' || user?.title === 'Project Manager' && user?.id === selectedPM?.id;
    if (!canModify) return;

    const updated = {
      ...planData,
      [planKey]: {
        ...planData[planKey],
        completed: !planData[planKey].completed
      }
    };
    setPlanData(updated);

    // Save to selected PM's record
    setTimeout(saveOnboardingData, 500);
  };

  const startEditingPlan = (planKey) => {
    // Only allow admin to edit plan content
    if (user?.role !== 'admin') return;

    const plan = planData[planKey];
    setEditingPlan(planKey);
    setEditPlanTitle(plan.title);
    setEditPlanItems([...plan.items]);
  };

  const savePlanEdits = async () => {
    if (!editingPlan) return;
    // Only allow admin to save plan edits
    if (user?.role !== 'admin') return;

    const updated = {
      ...planData,
      [editingPlan]: {
        ...planData[editingPlan],
        title: editPlanTitle,
        items: editPlanItems.filter((item) => item.trim() !== '')
      }
    };

    setPlanData(updated);
    setEditingPlan(null);
    setEditPlanTitle('');
    setEditPlanItems([]);

    // Save to selected PM's record
    setTimeout(saveOnboardingData, 500);
  };

  const cancelPlanEdits = () => {
    setEditingPlan(null);
    setEditPlanTitle('');
    setEditPlanItems([]);
  };

  const addPlanItem = () => {
    setEditPlanItems((prev) => [...prev, '']);
  };

  const updatePlanItem = (index, value) => {
    setEditPlanItems((prev) => prev.map((item, i) => i === index ? value : item));
  };

  const removePlanItem = (index) => {
    setEditPlanItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addNewItem = async (week) => {
    if (!newItemText.trim()) return;
    // Only allow admin to add new items
    if (user?.role !== 'admin') return;

    const newItem = {
      id: Date.now().toString(),
      text: newItemText,
      completed: false
    };

    if (week === 1) {
      setWeek1Checklist([...week1Checklist, newItem]);
      setIsAddingWeek1Item(false);
    } else {
      setWeek2Checklist([...week2Checklist, newItem]);
      setIsAddingWeek2Item(false);
    }

    setNewItemText('');

    // Save to selected PM's record
    setTimeout(saveOnboardingData, 500);
  };

  const removeChecklistItem = async (week, itemId) => {
    // Only allow admin to remove items
    if (user?.role !== 'admin') return;

    if (week === 1) {
      setWeek1Checklist(week1Checklist.filter((item) => item.id !== itemId));
    } else {
      setWeek2Checklist(week2Checklist.filter((item) => item.id !== itemId));
    }

    // Save to selected PM's record
    setTimeout(saveOnboardingData, 500);
  };

  const cancelAddItem = (week) => {
    if (week === 1) {
      setIsAddingWeek1Item(false);
    } else {
      setIsAddingWeek2Item(false);
    }
    setNewItemText('');
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this Employee Onboarding module? It will only be visible to Project Managers and Admins.')) {
      return;
    }

    try {
      // Check if module already exists
      const existingModules = await ReferenceModule.filter({ module_type: 'employee_onboarding' });

      if (existingModules.length > 0) {
        // Update existing module
        await ReferenceModule.update(existingModules[0].id, {
          is_archived: true,
          archived_date: new Date().toISOString(),
          archived_by: user.id
        });
      } else {
        // Create new module record
        await ReferenceModule.create({
          module_name: 'Employee Onboarding',
          module_type: 'employee_onboarding',
          is_archived: true,
          archived_date: new Date().toISOString(),
          archived_by: user.id
        });
      }

      // Redirect back to Reference Hub
      window.location.href = createPageUrl('ReferenceHub');
    } catch (error) {
      console.error('Error archiving module:', error);
      alert('Error archiving module. Please try again.');
    }
  };

  const allItems = [...week1Checklist, ...week2Checklist];
  const progress = allItems.length > 0 ? allItems.filter((item) => item.completed).length / allItems.length * 100 : 0;
  const isAdmin = user?.role === 'admin';
  const canArchive = user?.role === 'admin' || user?.title === 'Project Manager';
  const showPMSelector = isAdmin && projectManagers.length > 0;
  const canModify = isAdmin || user?.title === 'Project Manager' && user?.id === selectedPM?.id;

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>; // Or a spinner
  }

  return (
    <div className="bg-slate-50 text-white p-6 min-h-screen from-slate-900 via-slate-900 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-slate-900 text-3xl font-bold">Employee Onboarding</h1>
            <p className="text-slate-700 text-base">Welcome to your journey with us</p>
          </div>
          {canArchive &&
          <Button
            onClick={handleArchive}
            variant="outline"
            className="border-border text-foreground hover:bg-secondary">

              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          }
        </div>

        {/* Project Manager Selector for Admins */}
        {showPMSelector &&
        <Card className="bg-card border-border mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle className="text-foreground">Select Project Manager</CardTitle>
                  <CardDescription className="text-muted-foreground">Choose a project manager to view and manage their onboarding progress.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedPMId} onValueChange={setSelectedPMId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a project manager..." />
                </SelectTrigger>
                <SelectContent>
                  {projectManagers.map((pm) =>
                <SelectItem key={pm.id} value={pm.id}>
                      {pm.first_name} {pm.last_name}
                    </SelectItem>
                )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        }

        {/* Only show onboarding content if a PM is selected (for admins) or if user is a PM */}
        {(isAdmin && selectedPM || !isAdmin && user?.title === 'Project Manager') &&
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Show selected PM name for admins */}
            {isAdmin && selectedPM &&
          <div className="lg:col-span-2 mb-4">
                <div className="bg-gray-100 p-4 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Managing onboarding for:</p>
                  <p className="text-lg font-semibold text-foreground">{selectedPM.first_name} {selectedPM.last_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Changes will be saved to their personal onboarding progress</p>
                </div>
              </div>
          }

            {/* My Checklist */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">My Checklist</CardTitle>
                    <CardDescription className="text-muted-foreground">Key tasks to complete during your first two weeks.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                  <p className="text-right text-sm text-muted-foreground mt-1">{Math.round(progress)}% Complete</p>
                </div>

                {/* Week 1 Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Week 1</h3>
                  </div>
                  <div className="space-y-3">
                    {week1Checklist.map((item) =>
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <Checkbox
                      id={`week1-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(1, item.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                      disabled={!canModify} />


                        <label
                      htmlFor={`week1-${item.id}`}
                      className={`flex-1 text-sm font-medium leading-none cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.text}
                        </label>
                        {isAdmin &&
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(1, item.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                      title="Remove item">

                            <Trash2 className="w-3 h-3" />
                          </Button>
                    }
                      </div>
                  )}
                    {isAddingWeek1Item &&
                  <div className="p-3 border border-border rounded-lg space-y-3">
                        <Input
                      placeholder="Enter new checklist item..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNewItem(1)}
                      className="bg-background border-border text-foreground" />

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addNewItem(1)}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelAddItem(1)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                        </div>
                      </div>
                  }
                  </div>
                  {isAdmin && !isAddingWeek1Item &&
                <div className="mt-4">
                      <Button
                    onClick={() => setIsAddingWeek1Item(true)}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                }
                </div>

                {/* Week 2 Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Week 2</h3>
                  </div>
                  <div className="space-y-3">
                    {week2Checklist.map((item) =>
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <Checkbox
                      id={`week2-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(2, item.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                      disabled={!canModify} />


                        <label
                      htmlFor={`week2-${item.id}`}
                      className={`flex-1 text-sm font-medium leading-none cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.text}
                        </label>
                        {isAdmin &&
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(2, item.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                      title="Remove item">

                            <Trash2 className="w-3 h-3" />
                          </Button>
                    }
                      </div>
                  )}
                    {isAddingWeek2Item &&
                  <div className="p-3 border border-border rounded-lg space-y-3">
                        <Input
                      placeholder="Enter new checklist item..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNewItem(2)}
                      className="bg-background border-border text-foreground" />

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addNewItem(2)}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelAddItem(2)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                        </div>
                      </div>
                  }
                  </div>
                  {isAdmin && !isAddingWeek2Item &&
                <div className="mt-4">
                      <Button
                    onClick={() => setIsAddingWeek2Item(true)}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                }
                </div>
              </CardContent>
            </Card>

            {/* 90 Day Plan */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">Your 90-Day Plan</CardTitle>
                    <CardDescription className="text-muted-foreground">A roadmap for your first three months.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="days1-30" className="w-full">
                  <TabsList className="bg-secondary text-muted-foreground p-1 h-10 items-center justify-center rounded-md grid w-full grid-cols-3">
                    <TabsTrigger value="days1-30" className={planData['days1-30'].completed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}>
                      Days 1-30 {planData['days1-30'].completed && '✓'}
                    </TabsTrigger>
                    <TabsTrigger value="days31-60" className={planData['days31-60'].completed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}>
                      Days 31-60 {planData['days31-60'].completed && '✓'}
                    </TabsTrigger>
                    <TabsTrigger value="days61-90" className={planData['days61-90'].completed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}>
                      Days 61-90 {planData['days61-90'].completed && '✓'}
                    </TabsTrigger>
                  </TabsList>

                  {Object.entries(planData).map(([key, plan]) =>
                <TabsContent key={key} value={key} className="mt-4 p-4 border border-border rounded-lg">
                      {editingPlan === key ?
                  <div className="space-y-4">
                          <Input
                      value={editPlanTitle}
                      onChange={(e) => setEditPlanTitle(e.target.value)}
                      className="font-bold text-lg bg-background border-border text-foreground"
                      placeholder="Plan title..." />

                          <div className="space-y-3">
                            {editPlanItems.map((item, index) =>
                      <div key={index} className="flex gap-2">
                                <Input
                          value={item}
                          onChange={(e) => updatePlanItem(index, e.target.value)}
                          placeholder="Plan item..."
                          className="flex-1 bg-background border-border text-foreground" />

                                <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePlanItem(index)}
                          className="text-destructive hover:text-destructive/80">

                                  Remove
                                </Button>
                              </div>
                      )}
                            <Button
                        size="sm"
                        variant="ghost"
                        onClick={addPlanItem}
                        className="text-muted-foreground hover:text-foreground">

                              <Plus className="w-3 h-3 mr-1" />
                              Add Item
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={savePlanEdits}>Save Changes</Button>
                            <Button size="sm" variant="ghost" onClick={cancelPlanEdits} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                          </div>
                        </div> :

                  <>
                          <h3 className="font-bold text-lg mb-2 text-foreground">{plan.title}</h3>
                          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                            {plan.items.map((item, index) =>
                      <li key={index}>{item}</li>
                      )}
                          </ul>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                          id={`plan-${key}`}
                          checked={plan.completed}
                          onCheckedChange={() => togglePlanCompletion(key)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                          disabled={!canModify} />

                              <label
                          htmlFor={`plan-${key}`}
                          className="text-sm font-medium cursor-pointer text-foreground">

                                Mark as Complete
                              </label>
                            </div>
                            {isAdmin &&
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingPlan(key)}
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary">

                                <Edit className="w-3 h-3 mr-1" />
                                Edit Plan
                              </Button>
                      }
                          </div>
                        </>
                  }
                    </TabsContent>
                )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        }

        {/* Empty state for admins who haven't selected a PM yet */}
        {isAdmin && !selectedPM &&
        <div className="text-center py-16">
            <Users className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-foreground mb-3">Select a Project Manager</h3>
            <p className="text-muted-foreground">Choose a project manager above to view and manage their onboarding progress.</p>
          </div>
        }
      </div>
    </div>);

}