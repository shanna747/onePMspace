import React, { useState, useEffect, useCallback } from 'react';
import { TestingCard } from '@/api/entities';
import { Project } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save, RefreshCw, TestTube, ImageIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function TestingSetup({ project, onSave }) {
  const [testCards, setTestCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const loadTestCards = useCallback(async () => {
    setLoading(true);
    try {
      const cards = await TestingCard.filter({ project_id: project.id }, 'order');
      setTestCards(cards);
      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load test cards", e);
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    if (project?.id) {
      loadTestCards();
    }
  }, [project?.id, loadTestCards]);

  const handleUpdateCard = (id, field, value) => {
    setTestCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, [field]: value } : card))
    );
    setIsDirty(true);
  };

  const handleAddCard = async () => {
    try {
      const newCard = await TestingCard.create({
        project_id: project.id,
        title: "New Test - Click to edit",
        description: "Add a description for this test case.",
        order: testCards.length,
      });
      setTestCards((prev) => [...prev, newCard]);
      setIsDirty(true);
    } catch (e) {
      console.error("Failed to add test card", e);
      toast({ title: "Error", description: "Could not add new test card.", variant: "destructive" });
    }
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm("Are you sure you want to delete this test card?")) {
      try {
        await TestingCard.delete(id);
        setTestCards((prev) => prev.filter((card) => card.id !== id));
        toast({ title: "Success", description: "Test card removed. Changes will be saved on publish." });
        setIsDirty(true);
      } catch (e) {
        console.error("Failed to delete test card", e);
        toast({ title: "Error", description: "Could not delete test card.", variant: "destructive" });
      }
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(testCards);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    setTestCards(reorderedItems);
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const updatePromises = testCards.map((card, index) =>
        TestingCard.update(card.id, { ...card, order: index })
      );
      await Promise.all(updatePromises);
      
      // Update project to mark testing as published
      await Project.update(project.id, {
        testing_published: true,
        testing_last_published: new Date().toISOString()
      });
      
      setIsDirty(false);
      toast({
        title: "Testing Setup Published",
        description: "Your changes have been saved and are now live for clients and team members.",
      });
      if (onSave) {
        onSave(); // Call onSave prop if provided
      }
    } catch (e) {
      console.error("Failed to save changes", e);
      toast({
        title: "Error",
        description: "Could not save testing setup. Please try again.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleAddTestImages = (cardId) => {
    // Placeholder for adding test images functionality
    console.log(`Adding test images for card: ${cardId}`);
    toast({ title: "Info", description: `Image upload for card ${cardId} functionality to be implemented.` });
  };
  
  if (loading) {
    return <div className="p-6">Loading test setup...</div>;
  }

  return (
    <div className="p-6">
      <CardHeader className="flex flex-row justify-between items-center mb-6">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TestTube className="w-6 h-6" /> Testing Setup
          </CardTitle>
          <CardDescription>
            Configure test cases and sign-off requirements for client review.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTestCards} variant="outline" disabled={saving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reset
          </Button>
          <Button onClick={handleSaveChanges} disabled={!isDirty || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Publishing...' : 'Publish Testing Setup'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Test Cases ({testCards.length})</h3>
            <p className="text-sm text-muted-foreground">Manage items that require client sign-off</p>
          </div>
          <Button 
            onClick={handleAddCard}
            className="bg-white text-black border border-gray-300 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="testCards">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {testCards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-secondary/30 border border-border"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div {...provided.dragHandleProps} className="cursor-grab pt-2">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <Input
                                value={card.title}
                                onChange={(e) => handleUpdateCard(card.id, 'title', e.target.value)}
                                className="text-base font-semibold"
                              />
                              <Textarea
                                value={card.description}
                                onChange={(e) => handleUpdateCard(card.id, 'description', e.target.value)}
                                placeholder="Description..."
                                rows={3}
                              />
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCard(card.id)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button 
                              onClick={() => handleAddTestImages(card.id)}
                              variant="outline"
                              size="sm"
                              className="bg-white text-black border border-gray-300 hover:bg-gray-100"
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Add Test Images
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </div>
  );
}