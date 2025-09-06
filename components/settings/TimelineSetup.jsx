
import React, { useState, useEffect, useCallback } from "react";
import { TimelineItem } from "@/api/entities";
import { TimelineTemplate } from "@/api/entities";
import { TimelineTemplateItem } from "@/api/entities";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Save, Layers, Calendar, BookmarkPlus, Settings } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "@/components/ui/use-toast";
import TaskDetailModal from "./TaskDetailModal";

export default function TimelineSetup({ project }) {
  const [timelineItems, setTimelineItems] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'General',
    color: '#3b82f6'
  });

  const loadTimelineItems = useCallback(async () => {
    setLoading(true);
    try {
      // Load essential data first: timeline items and available templates
      const [items, templates] = await Promise.all([
        TimelineItem.filter({ project_id: project.id }, 'order'),
        TimelineTemplate.filter({ is_active: true }, 'name')
      ]);
      
      setTimelineItems(items);
      setAvailableTemplates(templates);
      
      // Then, attempt to load the user list for assignments.
      // This will not block the UI if it fails.
      try {
        const users = await User.list();
        setAllUsers(users);
      } catch (userError) {
        console.warn("Could not load user list for assignments:", userError);
        setAllUsers([]); // Proceed with an empty user list
      }

      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load timeline data", e);
      toast({ title: "Error", description: "Could not load essential timeline data.", variant: "destructive" });
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => {
    if (project?.id) {
      loadTimelineItems();
    }
  }, [project?.id, loadTimelineItems]);

  const handleUpdateItem = (id, field, value) => {
    setTimelineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setIsDirty(true);
  };

  const handleAddItem = async () => {
    try {
      const newItem = await TimelineItem.create({
        project_id: project.id,
        title: "New Item - Click to edit",
        description: "",
        due_date: new Date().toISOString().split('T')[0],
        order: timelineItems.length,
        is_completed: false,
      });
      setTimelineItems((prev) => [...prev, newItem]);
      setIsDirty(true);
      handleEditTask(newItem);
    } catch (e) {
      console.error("Failed to add item", e);
      toast({ title: "Error", description: "Could not add new item.", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("Are you sure you want to delete this item? This action is permanent.")) {
      try {
        const itemExists = timelineItems.find(item => item.id === id);
        if (!itemExists) {
          toast({ title: "Info", description: "Item has already been removed.", variant: "default" });
          return;
        }

        await TimelineItem.delete(id);
        
        setTimelineItems((prev) => prev.filter((item) => item.id !== id));
        toast({ title: "Success", description: "Item deleted. Changes will be saved on publish." });
        setIsDirty(true);
      } catch (e) {
        console.error("Failed to delete item", e);
        
        if (e.message?.includes("Object not found") || e.message?.includes("404")) {
          setTimelineItems((prev) => prev.filter((item) => item.id !== id));
          toast({ title: "Success", description: "Item removed from timeline.", variant: "default" });
          setIsDirty(true);
        } else {
          toast({ title: "Error", description: "Could not delete item. Please try again.", variant: "destructive" });
        }
      }
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      toast({ title: "Error", description: "Please select a template first.", variant: "destructive" });
      return;
    }

    setApplyingTemplate(true);
    try {
      const templateItems = await TimelineTemplateItem.filter({ template_id: selectedTemplateId }, 'order');
      
      if (templateItems.length === 0) {
        toast({ title: "Warning", description: "Selected template has no items.", variant: "destructive" });
        setApplyingTemplate(false);
        return;
      }

      if (timelineItems.length > 0) {
        const confirmReplace = window.confirm("Applying this template will replace all current timeline items. Are you sure you want to continue?");
        if (!confirmReplace) {
          setApplyingTemplate(false);
          return;
        }
        
        await Promise.all(timelineItems.map(item => TimelineItem.delete(item.id)));
      }

      const startDate = project.start_date ? new Date(project.start_date) : new Date();
      
      const templateIdToNewItemIdMap = new Map();
      const createdTimelineItems = [];

      for (const template of templateItems) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (template.default_offset_days || 0));

        const newItemData = {
          project_id: project.id,
          title: template.title,
          description: template.description,
          due_date: dueDate.toISOString().split('T')[0],
          is_completed: false,
          order: template.order,
          assigned_to: null,
          parent_id: null
        };

        const createdItem = await TimelineItem.create(newItemData);
        templateIdToNewItemIdMap.set(template.id, createdItem.id);
        createdTimelineItems.push({ ...createdItem, templateParentId: template.parent_id });
      }

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

      toast({ title: "Success", description: "Template applied successfully!" });
      setShowTemplateDialog(false);
      setSelectedTemplateId('');
      loadTimelineItems();
    } catch (e) {
      console.error("Failed to apply template", e);
      toast({ title: "Error", description: "Failed to apply template.", variant: "destructive" });
    }
    setApplyingTemplate(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast({ title: "Error", description: "Please enter a template name.", variant: "destructive" });
      return;
    }

    if (timelineItems.length === 0) {
      toast({ title: "Error", description: "Add some timeline items first before saving as a template.", variant: "destructive" });
      return;
    }

    setCreatingTemplate(true);
    try {
      const createdTemplate = await TimelineTemplate.create({
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        color: newTemplate.color,
        is_active: true
      });

      const templateItemsToCreate = [];
      const itemIdMap = new Map();

      for (const item of timelineItems) {
        const startDate = project.start_date ? new Date(project.start_date) : new Date();
        const itemDate = new Date(item.due_date);
        const offsetDays = Math.ceil((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const templateItemData = {
          template_id: createdTemplate.id,
          title: item.title,
          description: item.description,
          order: item.order || timelineItems.indexOf(item),
          default_offset_days: Math.max(0, offsetDays),
        };

        const createdTemplateItem = await TimelineTemplateItem.create(templateItemData);
        itemIdMap.set(item.id, createdTemplateItem.id);
        templateItemsToCreate.push({ ...createdTemplateItem, originalParentId: item.parent_id });
      }

      for (const templateItem of templateItemsToCreate) {
        if (templateItem.originalParentId && itemIdMap.has(templateItem.originalParentId)) {
          const newParentId = itemIdMap.get(templateItem.originalParentId);
          await TimelineTemplateItem.update(templateItem.id, { parent_id: newParentId });
        }
      }

      toast({ title: "Success", description: `Template "${newTemplate.name}" created successfully!` });
      setShowCreateTemplateDialog(false);
      setNewTemplate({ name: '', description: '', category: 'General', color: '#3b82f6' });
      
      const templates = await TimelineTemplate.filter({ is_active: true }, 'name');
      setAvailableTemplates(templates);
    } catch (e) {
      console.error("Failed to create template", e);
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    }
    setCreatingTemplate(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(timelineItems);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    setTimelineItems(reorderedItems);
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const cleanedItems = timelineItems.map(item => ({
        ...item,
        assigned_to: item.assigned_to === '' ? null : item.assigned_to,
        parent_id: item.parent_id === '' ? null : item.parent_id,
      }));

      const updatePromises = cleanedItems.map((item, index) =>
        TimelineItem.update(item.id, {
          ...item,
          order: index,
        })
      );
      await Promise.all(updatePromises);

      await Project.update(project.id, {
        timeline_published: true,
        timeline_last_published: new Date().toISOString()
      });

      setIsDirty(false);
      toast({
        title: "Timeline Published",
        description: "Timeline has been published and is now visible to clients and team members.",
      });

      loadTimelineItems();
    } catch (e) {
      console.error("Failed to publish timeline", e);
      toast({
        title: "Error",
        description: "Failed to publish timeline. Please try again.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const handleSaveTask = async (savedTask) => {
    await loadTimelineItems();
    setShowTaskDialog(false);
    setEditingTask(null);
    setIsDirty(true);
  };

  const handleDeleteTask = async (taskId) => {
    setTimelineItems(prev => prev.filter(item => item.id !== taskId));
    setShowTaskDialog(false);
    setEditingTask(null);
    setIsDirty(true);
    toast({ title: "Success", description: "Item deleted. Changes will be saved on publish." });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading timeline...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Timeline Configuration</h3>
          <p className="text-sm text-gray-500">
            {timelineItems.length === 0 
              ? "Start by selecting a template, creating one from scratch, or add individual timeline items manually."
              : "Drag to reorder, edit inline, save as template, and then publish your changes."
            }
          </p>
        </div>
        <div className="flex gap-2">
          {availableTemplates.length > 0 && (
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant={timelineItems.length === 0 ? "default" : "outline"} 
                  disabled={saving}
                  className={timelineItems.length === 0 ? "bg-primary hover:bg-primary/90" : ""}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {timelineItems.length === 0 ? "Choose Template" : "Apply Template"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Choose Timeline Template</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {timelineItems.length > 0 
                      ? "Applying a template will replace your current timeline items. This action cannot be undone."
                      : "Select a template to quickly create a timeline with pre-configured milestones and tasks."
                    }
                  </p>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-3">
                    {availableTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: template.color || '#3b82f6' }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-base">{template.name}</h4>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {template.description}
                              </p>
                            )}
                            {template.category && (
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowTemplateDialog(false);
                      setSelectedTemplateId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplyTemplate} 
                    disabled={!selectedTemplateId || applyingTemplate}
                  >
                    {applyingTemplate ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        Applying...
                      </div>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Apply Template
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {timelineItems.length > 0 && (
            <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={saving}>
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Timeline Template</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Save your current timeline configuration as a reusable template for future projects.
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Website Development Timeline"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateDescription">Description</Label>
                    <Textarea
                      id="templateDescription"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe when this template should be used..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateCategory">Category</Label>
                      <Input
                        id="templateCategory"
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="General"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="templateColor">Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="templateColor"
                          type="color"
                          value={newTemplate.color}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={newTemplate.color}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateTemplateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTemplate} 
                    disabled={creatingTemplate || !newTemplate.name.trim()}
                  >
                    {creatingTemplate ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Button onClick={handleAddItem} variant="outline" disabled={saving}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={handleSaveChanges} disabled={!isDirty || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Publishing...' : 'Publish Timeline'}
          </Button>
        </div>
      </div>

      {timelineItems.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Items Yet</h3>
          <p className="text-gray-600 mb-6">Get started by choosing from existing templates or create your own timeline from scratch.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {availableTemplates.length > 0 ? (
              <>
                <Button onClick={() => setShowTemplateDialog(true)} className="bg-primary hover:bg-primary/90">
                  <Layers className="w-4 h-4 mr-2" />
                  Browse Templates ({availableTemplates.length})
                </Button>
                <Button onClick={handleAddItem} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Timeline
                </Button>
              </>
            ) : (
              <Button onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Timeline Item
              </Button>
            )}
          </div>
          
          {availableTemplates.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-4">Popular Templates:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {availableTemplates.slice(0, 4).map((template) => (
                  <Button
                    key={template.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      handleApplyTemplate();
                    }}
                    className="text-xs"
                    disabled={applyingTemplate}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: template.color || '#3b82f6' }}
                    />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {timelineItems.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="timeline">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {timelineItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-white p-4 rounded-lg border shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div {...provided.dragHandleProps} className="cursor-grab pt-2">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <Input
                              value={item.title || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                              className="font-semibold"
                              placeholder="Timeline item title..."
                            />
                            <Textarea
                              value={item.description || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                              placeholder="Description..."
                              rows={2}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Due Date</label>
                                <Input
                                  type="date"
                                  value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handleUpdateItem(item.id, 'due_date', e.target.value)}
                                />
                              </div>
                              {allUsers.length > 0 && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Assigned To</label>
                                  <Select
                                    value={item.assigned_to || ''}
                                    onValueChange={(value) => handleUpdateItem(item.id, 'assigned_to', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={null}>Unassigned</SelectItem>
                                      {allUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.first_name} {user.last_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div>
                                <label className="block text-sm font-medium mb-1">Parent Task</label>
                                <Select
                                  value={item.parent_id || ''}
                                  onValueChange={(value) => handleUpdateItem(item.id, 'parent_id', value || null)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="No parent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>No parent</SelectItem>
                                    {timelineItems
                                      .filter(t => t.id !== item.id)
                                      .map(parent => (
                                        <SelectItem key={parent.id} value={parent.id}>
                                          {parent.title}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {timelineItems.length > 0 && (
        <Button onClick={handleAddItem} variant="outline" className="w-full mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Timeline Item
        </Button>
      )}

      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          allUsers={allUsers}
          isOpen={showTaskDialog}
          onClose={() => {
            setShowTaskDialog(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
