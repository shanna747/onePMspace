import React, { useState, useEffect, useCallback } from 'react';
import { TestingCard } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CheckCircle,
  Clock,
  PlusCircle,
  Edit,
  ClipboardList,
  TestTube,
  GripVertical,
  Archive
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ProjectTesting({ project, user }) {
  const [testingCards, setTestingCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTestCards = useCallback(async () => {
    setLoading(true);
    try {
      const cards = await TestingCard.filter({ project_id: project.id }, 'order');
      setTestingCards(cards);
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

  const handleArchiveTestCard = async (cardId) => {
    if (!confirm('Are you sure you want to archive this test card?')) return;

    try {
      await TestingCard.delete(cardId);
      setTestingCards((prev) => prev.filter(card => card.id !== cardId));
    } catch (error) {
      console.error("Error archiving test card:", error);
      alert("Failed to archive test card. Please try again.");
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) {
      return;
    }

    const reorderedItems = Array.from(testingCards);
    const [removed] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, removed);

    setTestingCards(reorderedItems);

    try {
      const updatePromises = reorderedItems.map((card, index) =>
        TestingCard.update(card.id, { order: index })
      );
      await Promise.all(updatePromises);
    } catch (e) {
      console.error("Failed to update card order", e);
      loadTestCards();
    }
  };

  const canEdit = user && (user.role === 'admin' || user.title === 'Project Manager');

  if (loading) {
    return <div className="p-6">Loading test cards...</div>;
  }

  return (
    <div className="p-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Testing & Sign-off</h2>
          <p className="text-muted-foreground">Review and approve project deliverables.</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Link to={createPageUrl(`CreateTestCard`, { project_id: project.id })}>
                <Button variant="outline">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Test Card
                </Button>
              </Link>
              <Link to={createPageUrl(`ProjectSettings`, { id: project.id, tab: 'testing' })}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        {testingCards.length === 0 ? (
          <div className="text-center py-12">
            <TestTube className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No test cards yet.</h3>
            <p className="text-gray-500">Test cards will appear here once they are configured.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="testCardsDroppable">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {testingCards.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {canEdit && (
                                  <div {...provided.dragHandleProps} className="cursor-grab">
                                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <Link to={createPageUrl(`TestCardDetails?id=${card.id}`)} className="flex-1">
                                  <div className="flex items-center gap-3">
                                    {card.is_signed_off ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <Clock className="w-5 h-5 text-yellow-500" />
                                    )}
                                    <div>
                                      <h3 className="font-medium text-foreground">{card.title}</h3>
                                      <p className="text-sm text-muted-foreground">{card.description}</p>
                                    </div>
                                  </div>
                                </Link>
                              </div>
                              {canEdit && (
                                <Button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleArchiveTestCard(card.id);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
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
      </div>
    </div>
  );
}