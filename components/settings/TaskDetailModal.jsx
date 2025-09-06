
import React, { useState, useEffect, useCallback } from 'react';
import { TimelineItem } from '@/api/entities';
import { User } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar as CalendarIcon, User as UserIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetailModal({ task, project, users, isOpen, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: ''
  });
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const loadAvailableUsers = useCallback(async () => {
    // Use the user list passed from the parent component
    if (users && users.length > 0) {
      setAvailableUsers(users);
      return;
    }

    try {
      const allUsers = await User.list();
      
      // Get project team members and project managers
      const projectTeamIds = project.team_member_ids || [];
      const projectManagerIds = project.project_manager_ids || [];
      const legacyPmId = project.project_manager_id;
      
      const relevantUserIds = new Set([
        ...projectTeamIds,
        ...projectManagerIds,
        ...(legacyPmId ? [legacyPmId] : [])
      ]);
      
      const projectUsers = allUsers.filter(user => 
        relevantUserIds.has(user.id) || user.role === 'admin'
      );
      
      setAvailableUsers(projectUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    }
  }, [project.team_member_ids, project.project_manager_ids, project.project_manager_id, users]);

  useEffect(() => {
    if (task) {
      setFormData({
        id: task.id, // Keep track of the ID for updates
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        assigned_to: task.assigned_to || ''
      });
      
      if (task.due_date) {
        setSelectedDate(new Date(task.due_date));
      } else {
        setSelectedDate(null);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        due_date: '',
        assigned_to: ''
      });
      setSelectedDate(null);
    }
    
    // Load available users for assignment
    loadAvailableUsers();
  }, [task, loadAvailableUsers]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, due_date: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData
      };
      
      // The onSave function will handle create vs update
      await onSave(dataToSave);
      onClose(); // Assuming the modal should close on successful save
      
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    
    if (confirm('Are you sure you want to delete this timeline item?')) {
      try {
        await TimelineItem.delete(task.id);
        onDelete(task.id);
        onClose();
      } catch (error) {
        console.error("Error deleting task:", error);
        
        // If the item doesn't exist in the database, still call onDelete to remove from UI
        if (error.message?.includes("Object not found") || error.message?.includes("404")) {
          onDelete(task.id);
          onClose();
        } else {
          alert("Failed to delete task. Please try again.");
        }
      }
    }
  };

  const getAssignedUserName = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {task?.id ? 'Edit Timeline Item' : 'Create Timeline Item'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description..."
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mt-2 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select team member">
                    {formData.assigned_to && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        {getAssignedUserName(formData.assigned_to)}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <span>{user.first_name} {user.last_name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {user.title || user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {task?.id && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {task?.id ? 'Save Changes' : 'Create Task'}
                </div>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
