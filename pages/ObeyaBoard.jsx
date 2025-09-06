import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ObeyaBoard } from '@/api/entities';
import { ObeyaCard } from '@/api/entities';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, GripVertical, Trash2, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const priorityConfig = {
  low: { label: 'Low', color: 'bg-blue-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'bg-red-500' }
};

const ObeyaCardComponent = ({ card, provided, users, onDelete, onEdit }) => {
  const assignedUser = users.find((u) => u.id === card.assigned_to);
  const priority = priorityConfig[card.priority] || priorityConfig.medium;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="card-modern p-4 mb-4 rounded-lg shadow-sm">

      <div className="flex justify-between items-start">
        <h4 className="font-bold text-md mb-2">{card.title}</h4>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(card.id)}>
                <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => onDelete(card.id)}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {assignedUser &&
          <div
            className="w-7 h-7 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs font-bold"
            title={assignedUser.first_name + ' ' + assignedUser.last_name}>

              {assignedUser.first_name?.[0]}{assignedUser.last_name?.[0]}
            </div>
          }
          <Badge className={`${priority.color} text-white text-xs`}>{priority.label}</Badge>
        </div>
        {card.due_date &&
        <Badge variant="outline" className="text-xs">
            Due: {new Date(card.due_date).toLocaleDateString()}
          </Badge>
        }
      </div>
    </div>);

};


export default function ObeyaBoardPage() {
  const location = useLocation();
  const boardId = new URLSearchParams(location.search).get('id');

  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId]);

  const loadBoardData = async () => {
    setLoading(true);
    try {
      const [boardData, cardsData, usersData] = await Promise.all([
      ObeyaBoard.filter({ id: boardId }),
      ObeyaCard.filter({ board_id: boardId }, 'order'),
      User.list()]
      );

      if (boardData.length > 0) {
        setBoard(boardData[0]);
      }
      setCards(cardsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading board data:", error);
    }
    setLoading(false);
  };

  const handleDeleteCard = async (cardId) => {
    if (confirm('Are you sure you want to delete this card?')) {
      await ObeyaCard.delete(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
    destination.droppableId === source.droppableId &&
    destination.index === source.index)
    {
      return;
    }

    const startColumnId = source.droppableId;
    const endColumnId = destination.droppableId;

    const movedCard = cards.find((c) => c.id === draggableId);

    // Optimistic update
    const newCards = Array.from(cards);

    // Remove from old position
    const sourceColumnCards = newCards.filter((c) => c.column_id === startColumnId).sort((a, b) => a.order - b.order);
    sourceColumnCards.splice(source.index, 1);

    // Add to new position
    const destColumnCards = newCards.filter((c) => c.column_id === endColumnId).sort((a, b) => a.order - b.order);
    const updatedMovedCard = { ...movedCard, column_id: endColumnId };
    destColumnCards.splice(destination.index, 0, updatedMovedCard);

    // Rebuild the cards array
    const otherCards = newCards.filter((c) => c.column_id !== startColumnId && c.column_id !== endColumnId);
    setCards([...otherCards, ...sourceColumnCards, ...destColumnCards]);

    // Update DB
    await ObeyaCard.update(draggableId, { column_id: endColumnId });

    // Update order for both columns
    const sourceUpdatePromises = sourceColumnCards.map((card, index) =>
    ObeyaCard.update(card.id, { order: index })
    );
    const destUpdatePromises = destColumnCards.map((card, index) =>
    ObeyaCard.update(card.id, { order: index })
    );

    await Promise.all([...sourceUpdatePromises, ...destUpdatePromises]);
    loadBoardData(); // Re-sync with DB
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>);

  }

  if (!board) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Board not found</h2>
        <Link to={createPageUrl("ObeyaBoards")}>
          <Button variant="outline" className="bg-slate-950 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10">Back to Boards</Button>
        </Link>
      </div>);

  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Link to={createPageUrl("ObeyaBoards")}>
                <Button variant="outline" size="icon" className="bg-purple-600 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 w-10">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold">{board.title}</h1>
                <p className="text-secondary">{board.description}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Link to={createPageUrl(`CreateObeyaBoard?id=${board.id}`)}>
                <Button variant="outline" className="bg-slate-950 text-slate-950 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10"><Edit className="w-4 h-4 mr-2" /> Edit Board</Button>
            </Link>
            <Link to={createPageUrl(`CreateObeyaCard?boardId=${board.id}`)}>
                <Button className="bg-purple-600 text-primary-foreground px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-10"><Plus className="w-4 h-4 mr-2" /> Add Card</Button>
            </Link>
        </div>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${board.columns.length}, minmax(300px, 1fr))` }}>
          {board.columns.sort((a, b) => a.order - b.order).map((column) => {
            const columnCards = cards.filter((card) => card.column_id === column.id).sort((a, b) => a.order - b.order);
            return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided) =>
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="p-4 rounded-xl h-full min-h-[calc(100vh-200px)]"
                  style={{ backgroundColor: `${column.color}20` }} // semi-transparent column bg
                >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-slate-50 text-lg font-bold" style={{ color: column.color }}>{column.title}</h3>
                      <Badge variant="secondary" className="bg-slate-950 text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80">{columnCards.length}</Badge>
                    </div>
                    {columnCards.map((card, index) =>
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) =>
                    <ObeyaCardComponent
                      card={card}
                      provided={provided}
                      users={users}
                      onDelete={() => handleDeleteCard(card.id)}
                      onEdit={() => window.location.href = createPageUrl(`CreateObeyaCard?id=${card.id}&boardId=${board.id}`)} />

                    }
                      </Draggable>
                  )}
                    {provided.placeholder}
                  </div>
                }
              </Droppable>);

          })}
        </div>
      </DragDropContext>
    </div>);

}