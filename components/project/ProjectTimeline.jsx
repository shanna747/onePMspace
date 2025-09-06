import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TimelineItem } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Circle, Clock, User as UserIcon, Edit, RefreshCw, Calendar, AlertCircle, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProjectTimeline({ project, user, onProjectUpdate }) {
  const [timelineItems, setTimelineItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(project);
  const [expandedItems, setExpandedItems] = useState({});
  const [completingItem, setCompletingItem] = useState(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: ''
  });

  const loadData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
        const userList = await User.list();
        setUsers(userList);

        const canViewTimeline = user.role === 'admin' || user.title === 'Project Manager' || project.timeline_published;
        
        if (canViewTimeline) {
          const items = await TimelineItem.filter({ project_id: project.id }, 'due_date');
          setTimelineItems(items);
        } else {
          setTimelineItems([]);
        }
        setCurrentProject(project);
    } catch (e) {
      console.error("Failed to load timeline data", e);
    } finally {
      setLoading(false);
    }
  }, [project, user?.role, user?.title]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemCompletion = async (item) => {
    setCompletingItem(item.id);
    try {
      await TimelineItem.update(item.id, { is_completed: !item.is_completed });
      await loadData();
    } catch (error) {
      console.error("Error updating item completion:", error);
    } finally {
      setCompletingItem(null);
    }
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      title: '',
      description: '',
      due_date: '',
      assigned_to: ''
    });
    setShowAddItemDialog(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      title: item.title || '',
      description: item.description || '',
      due_date: item.due_date ? format(new Date(item.due_date), 'yyyy-MM-dd') : '',
      assigned_to: item.assigned_to || ''
    });
    setShowAddItemDialog(true);
  };

  const handleSaveItem = async () => {
    try {
      const dataToSave = {
          ...itemForm,
          due_date: itemForm.due_date ? new Date(itemForm.due_date).toISOString() : null
      };

      if (editingItem) {
        await TimelineItem.update(editingItem.id, dataToSave);
      } else {
        await TimelineItem.create({ 
          ...dataToSave, 
          project_id: project.id, 
          order: timelineItems.length,
          is_completed: false
        });
      }
      setShowAddItemDialog(false);
      setEditingItem(null);
      await loadData();
    } catch (error) {
      console.error("Failed to save timeline item:", error);
      alert("There was an error saving the item.");
    }
  };

  const toggleItemExpansion = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  const userMap = useMemo(() => {
    return users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});
  }, [users]);

  const getAssignedUser = (userId) => userMap[userId] || null;
  
  const getInitials = (userId) => {
    const u = userMap[userId];
    return u ? `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}` : '?';
  };
  
  const canEditProjectSettings = user.role === 'admin' || user.title === 'Project Manager';
  const isTimelinePublished = currentProject?.timeline_published;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (!isTimelinePublished && !canEditProjectSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-16 h-16 text-muted-foreground/50 mb-6" />
        <h3 className="text-xl font-semibold text-foreground mb-3">Timeline Not Yet Available</h3>
        <p className="text-muted-foreground max-w-md">
          The project timeline is being prepared and will be available soon.
        </p>
      </div>
    );
  }
  
  const canManageTimeline = user.role === 'admin' || user.title === 'Project Manager';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Timeline</h2>
          <p className="text-muted-foreground">Track project milestones and deliverables.</p>
        </div>
        <div className="flex items-center gap-4">
          {canEditProjectSettings && (
            <Link to={createPageUrl(`ProjectSettings?id=${project.id}&tab=timeline`)}>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Manage Timeline
              </Button>
            </Link>
          )}
          {canManageTimeline && (
             <Button onClick={handleOpenAddItem} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
          )}
          <Button onClick={loadData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {timelineItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
             <Calendar className="w-16 h-16 text-muted-foreground/50 mb-6" />
            <h3 className="text-xl font-semibold text-foreground mb-3">No Timeline Items</h3>
            <p className="text-muted-foreground max-w-md">
              {canEditProjectSettings 
                ? "This project doesn't have any timeline items yet. Click 'Manage Timeline' to add some." 
                : "No timeline items have been added to this project yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {timelineItems.map((item) => {
            const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.is_completed;
            const assignedUser = getAssignedUser(item.assigned_to);

            return (
              <Card key={item.id} className={`transition-all duration-200 ${
                item.is_completed 
                  ? 'bg-secondary/50 border-secondary' 
                  : isOverdue 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-card border-border hover:shadow-md'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleItemCompletion(item)}
                      className="mt-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={completingItem === item.id}
                    >
                      {item.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className={`w-6 h-6 ${isOverdue ? 'text-destructive' : 'text-muted-foreground hover:text-primary'}`} />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-semibold text-lg ${item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2">
                           {item.due_date && (
                            <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                              <Clock className="w-3 h-3 mr-1.5" />
                              {format(new Date(item.due_date), 'MMM dd, yyyy')}
                            </Badge>
                          )}
                          <button onClick={() => toggleItemExpansion(item.id)} className="text-muted-foreground hover:text-primary">
                            {expandedItems[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {expandedItems[item.id] && (
                        <div className="mt-4 space-y-4 pt-4 border-t border-border/50">
                          <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {assignedUser ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/50">
                                    {getInitials(assignedUser.id)}
                                  </div>
                                  <span className="text-sm text-muted-foreground">Assigned to {assignedUser.first_name} {assignedUser.last_name}</span>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                  <UserIcon className="w-4 h-4" />
                                  <span>Unassigned</span>
                                </div>
                              )}
                            </div>
                             {canManageTimeline && <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}><Edit className="w-3 h-3 mr-2" />Edit</Button>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showAddItemDialog && (
        <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Timeline Item' : 'Add New Timeline Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="item-title">Title</Label>
                <Input id="item-title" value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="item-desc">Description</Label>
                <Textarea id="item-desc" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} rows={4} />
              </div>
              <div>
                <Label htmlFor="item-due-date">Due Date</Label>
                <Input id="item-due-date" type="date" value={itemForm.due_date} onChange={e => setItemForm({...itemForm, due_date: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="item-assigned-to">Assigned To</Label>
                 <Select value={itemForm.assigned_to} onValueChange={value => setItemForm({...itemForm, assigned_to: value})}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={null}>Unassigned</SelectItem>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveItem}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}