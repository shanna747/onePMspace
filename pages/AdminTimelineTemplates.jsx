
import React, { useState, useEffect, useCallback } from 'react';
import { TimelineTemplate } from '@/api/entities';
import { TimelineTemplateItem } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Edit, Star, Copy, Palette } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Label } from '@/components/ui/label';

export default function AdminTimelineTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'General',
    color: '#3b82f6'
  });

  // Debounced template items loading to prevent rate limiting
  const loadTemplateItems = useCallback(async (templateId) => {
    if (!templateId) return;
    
    try {
      // Add a small delay to prevent rapid API calls
      await new Promise(resolve => setTimeout(resolve, 100));
      const items = await TimelineTemplateItem.filter({ template_id: templateId }, 'order');
      setTemplateItems(items);
    } catch (error) {
      console.error("Error loading template items:", error);
      setTemplateItems([]);
    }
  }, []); // Dependencies are stable, so empty array is correct

  useEffect(() => {
    let isMounted = true;
    
    const loadTemplates = async () => {
      if (!isMounted) return; // Check if component is still mounted before starting
      
      setLoading(true);
      try {
        // Add a small delay to prevent immediate API call on mount
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!isMounted) return; // Check again after delay
        
        const allTemplates = await TimelineTemplate.list('-created_date');
        
        if (!isMounted) return; // Check again after API call
        
        setTemplates(allTemplates);
        
        // Only auto-select if no template is currently selected
        // selectedTemplate will be null on initial mount, allowing this block to execute.
        if (allTemplates.length > 0 && !selectedTemplate) {
          const defaultTemplate = allTemplates.find(t => t.is_default) || allTemplates[0];
          setSelectedTemplate(defaultTemplate);
          
          // Load items for the selected template with another small delay
          setTimeout(() => {
            if (isMounted) { // Ensure component is still mounted before calling loadTemplateItems
              loadTemplateItems(defaultTemplate.id);
            }
          }, 300);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        if (isMounted) { // Only update state if mounted
          setTemplates([]);
        }
      } finally {
        if (isMounted) { // Only update state if mounted
          setLoading(false);
        }
      }
    };

    loadTemplates();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [loadTemplateItems]); // Added loadTemplateItems as a dependency, as it's used inside the effect

  const handleTemplateSelect = async (template) => {
    if (selectedTemplate?.id === template.id) return; // Prevent unnecessary calls if the same template is selected
    
    setSelectedTemplate(template);
    // Add delay before loading items to prevent rapid API calls
    setTimeout(() => {
      loadTemplateItems(template.id);
    }, 100);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return; // Prevent creating template with empty name
    
    try {
      // If this is the first template, make it default
      const isFirstTemplate = templates.length === 0;
      
      const createdTemplate = await TimelineTemplate.create({
        ...newTemplate,
        is_default: isFirstTemplate
      });
      
      setTemplates(prev => [createdTemplate, ...prev]);
      setSelectedTemplate(createdTemplate);
      setTemplateItems([]);
      setShowNewTemplateDialog(false);
      setNewTemplate({ name: '', description: '', category: 'General', color: '#3b82f6' });
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template. Please try again.");
    }
  };

  const handleUpdateTemplate = async (templateId, updates) => {
    try {
      const updatedTemplate = await TimelineTemplate.update(templateId, updates);
      setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(updatedTemplate);
      }
    } catch (error) {
      console.error("Error updating template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm("Are you sure you want to delete this template and all its items?")) return;
    
    try {
      await TimelineTemplate.delete(templateId);
      
      // Delete all items in this template
      const itemsToDelete = await TimelineTemplateItem.filter({ template_id: templateId });
      await Promise.all(itemsToDelete.map(item => TimelineTemplateItem.delete(item.id)));
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      if (selectedTemplate?.id === templateId) {
        const remainingTemplates = templates.filter(t => t.id !== templateId);
        if (remainingTemplates.length > 0) {
          handleTemplateSelect(remainingTemplates[0]);
        } else {
          setSelectedTemplate(null);
          setTemplateItems([]);
        }
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template. Please try again.");
    }
  };

  const handleSetDefault = async (templateId) => {
    try {
      // Remove default from all templates by staggering updates to prevent rate limiting
      const updatePromises = templates.map((t, index) => 
        new Promise(resolve => {
          setTimeout(async () => {
            try {
              await TimelineTemplate.update(t.id, { is_default: t.id === templateId });
              resolve();
            } catch (error) {
              console.error(`Error updating template ${t.id}:`, error);
              resolve(); // Resolve even if one update fails to allow Promise.all to complete
            }
          }, index * 100); // Stagger the updates by 100ms each
        })
      );
      
      await Promise.all(updatePromises);
      setTemplates(prev => prev.map(t => ({ ...t, is_default: t.id === templateId })));
    } catch (error) {
      console.error("Error setting default template:", error);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const duplicatedTemplate = await TimelineTemplate.create({
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        color: template.color
      });
      
      // Duplicate all items
      const items = await TimelineTemplateItem.filter({ template_id: template.id }, 'order');
      const itemMapping = new Map();
      
      // First pass: create items without parent relationships
      for (const item of items) {
        const newItem = await TimelineTemplateItem.create({
          template_id: duplicatedTemplate.id,
          title: item.title,
          description: item.description,
          order: item.order,
          default_offset_days: item.default_offset_days
        });
        itemMapping.set(item.id, newItem.id);
      }
      
      // Second pass: set parent relationships
      for (const item of items) {
        if (item.parent_id && itemMapping.has(item.parent_id)) {
          const newItemId = itemMapping.get(item.id);
          const newParentId = itemMapping.get(item.parent_id);
          await TimelineTemplateItem.update(newItemId, { parent_id: newParentId });
        }
      }
      
      setTemplates(prev => [duplicatedTemplate, ...prev]);
    } catch (error) {
      console.error("Error duplicating template:", error);
      alert("Failed to duplicate template. Please try again.");
    }
  };

  // Template Item Management (existing logic, but now filtered by selectedTemplate)
  const handleUpdateTemplateItem = (id, field, value) => {
    setTemplateItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveItemChanges = async (id) => {
    const item = templateItems.find(t => t.id === id);
    if (item) {
      try {
        await TimelineTemplateItem.update(id, {
          title: item.title,
          description: item.description,
          default_offset_days: Number(item.default_offset_days) || 0,
          parent_id: item.parent_id || null
        });
        alert('Template item saved!');
      } catch (error) {
        console.error("Error saving item:", error);
      }
    }
  };

  const handleAddTemplateItem = async () => {
    if (!selectedTemplate) return;
    
    try {
      const newItem = await TimelineTemplateItem.create({
        template_id: selectedTemplate.id,
        title: 'New Template Item',
        description: '',
        order: templateItems.length,
        default_offset_days: 0
      });
      setTemplateItems(prev => [...prev, newItem]);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleDeleteTemplateItem = async (id) => {
    if (confirm('Are you sure you want to delete this template item?')) {
      try {
        // Check if this item is a parent to other items
        const children = templateItems.filter(t => t.parent_id === id);
        if (children.length > 0) {
          alert("Cannot delete this item because it's a parent to other items. Please reassign children first.");
          return;
        }
        
        await TimelineTemplateItem.delete(id);
        setTemplateItems(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(templateItems);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    setTemplateItems(reordered);
    
    try {
      await Promise.all(reordered.map((item, index) => 
        TimelineTemplateItem.update(item.id, { order: index })
      ));
    } catch (error) {
      console.error("Error reordering items:", error);
    }
  };

  const isDescendant = (child, potentialParent, allItems) => {
    if (!potentialParent.parent_id) return false;
    if (potentialParent.parent_id === child.id) return true;
    const nextParent = allItems.find(t => t.id === potentialParent.parent_id);
    if (!nextParent) return false;
    return isDescendant(child, nextParent, allItems);
  };

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
            <h1 className="text-3xl font-bold text-foreground">Timeline Templates</h1>
            <p className="text-muted-foreground">Create and manage timeline templates for different project types.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>{templates.length} templates</CardDescription>
                </div>
                <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Template Name</Label>
                        <Input
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Website Design, Mobile App"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe when to use this template..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Input
                            value={newTemplate.category}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="General"
                          />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={newTemplate.color}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, color: e.target.value }))}
                              className="w-12 p-1"
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
                      <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTemplate} disabled={!newTemplate.name.trim()}>
                        Create Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No templates yet</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                ) : (
                  templates.map(template => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card border-border hover:bg-accent'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: template.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{template.name}</h4>
                            {template.is_default && (
                              <Star className="w-3 h-3 text-amber-500 fill-current" />
                            )}
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Template Items Editor */}
          <div className="lg:col-span-3">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: selectedTemplate.color }}
                      />
                      <div>
                        <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                        <CardDescription>{selectedTemplate.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(selectedTemplate)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </Button>
                      {!selectedTemplate.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(selectedTemplate.id)}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddTemplateItem}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {templateItems.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">No items in this template yet</p>
                      <Button onClick={handleAddTemplateItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Item
                      </Button>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="template-items">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {templateItems.map((item, index) => {
                              const potentialParents = templateItems.filter(p => 
                                p.id !== item.id && !isDescendant(item, p, templateItems)
                              );
                              return (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="p-4 rounded-lg border border-border bg-secondary/50 flex items-start gap-3"
                                    >
                                      <div {...provided.dragHandleProps} className="cursor-grab pt-2">
                                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1 space-y-3">
                                        <Input
                                          value={item.title}
                                          onChange={(e) => handleUpdateTemplateItem(item.id, 'title', e.target.value)}
                                          className="text-base font-semibold"
                                        />
                                        <Textarea
                                          value={item.description}
                                          onChange={(e) => handleUpdateTemplateItem(item.id, 'description', e.target.value)}
                                          placeholder="Description..."
                                          rows={2}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-sm font-medium mb-1 block">Due Offset (days)</Label>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="number"
                                                value={item.default_offset_days}
                                                onChange={(e) => handleUpdateTemplateItem(item.id, 'default_offset_days', e.target.value)}
                                                className="w-24"
                                              />
                                              <span className="text-sm text-muted-foreground">days after project start</span>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium mb-1 block">Parent Item</Label>
                                            <Select
                                              value={item.parent_id || ''}
                                              onValueChange={(value) => handleUpdateTemplateItem(item.id, 'parent_id', value || null)}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a parent..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value={null}>None (Top-level)</SelectItem>
                                                {potentialParents.map(p => (
                                                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <Button size="icon" onClick={() => handleSaveItemChanges(item.id)}>
                                          <Save className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          size="icon" 
                                          variant="destructive" 
                                          onClick={() => handleDeleteTemplateItem(item.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Select a template to edit its items</p>
                    <p className="text-sm text-muted-foreground">
                      {templates.length === 0 ? "Create your first template to get started" : "Choose a template from the sidebar"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
