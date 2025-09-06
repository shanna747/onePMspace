
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ObeyaBoard } from '@/api/entities';
import { Project } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Plus, Check, ChevronsUpDown, Save } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge'; // Added import for Badge

export default function CreateObeyaBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  const editBoardId = new URLSearchParams(location.search).get("edit");
  const isEditing = !!editBoardId;

  // Extracted title and description into their own states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // formData now only holds project_ids and metric_status
  const [formData, setFormData] = useState({
    project_ids: [],
    metric_status: 'green'
  });

  const [columns, setColumns] = useState([
    { id: 'todo', title: 'To Do', color: '#7600bc', order: 0 },
    { id: 'in-progress', title: 'In Progress', color: '#4c00b0', order: 1 },
    { id: 'done', title: 'Done', color: '#020517', order: 2 }]
  );

  const [projects, setProjects] = useState([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);

  useEffect(() => {
    const fetchData = async () => {
      await loadInitialData();
      if (isEditing) {
        await loadBoardData();
      }
    };
    fetchData();
  }, [isEditing, editBoardId]);

  const loadInitialData = async () => {
    try {
      const projectList = await Project.list();
      setProjects(projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Optionally handle error in UI
    }
  };

  const loadBoardData = async () => {
    if (!editBoardId) return;

    setLoadingData(true);
    try {
      const boards = await ObeyaBoard.filter({ id: editBoardId });
      if (boards.length > 0) {
        const board = boards[0];
        setTitle(board.title || ''); // Set title from board data
        setDescription(board.description || ''); // Set description from board data
        setFormData(prev => ({ // Update formData for project_ids and metric_status
          ...prev,
          project_ids: board.project_ids || [],
          metric_status: board.metric_status || 'green'
        }));
        if (board.columns && board.columns.length > 0) {
          setColumns(board.columns.sort((a, b) => a.order - b.order));
        } else {
          // If existing board has no columns, set to default with updated 'in-progress' id
          setColumns([
            { id: 'todo', title: 'To Do', color: '#7600bc', order: 0 },
            { id: 'in-progress', title: 'In Progress', color: '#4c00b0', order: 1 },
            { id: 'done', title: 'Done', color: '#020517', order: 2 }]
          );
        }
      } else {
        // Board not found, navigate away or show error
        console.warn(`Board with ID ${editBoardId} not found.`);
        navigate(createPageUrl('ObeyaBoards')); // Redirect to list if board not found
      }
    } catch (error) {
      console.error('Error loading board data:', error);
      alert('Failed to load board data. Please try again.');
      navigate(createPageUrl('ObeyaBoards')); // Redirect on error
    } finally {
      setLoadingData(false);
    }
  };

  // Renamed from handleProjectSelectionChange to handleProjectSelection as per outline
  const handleProjectSelection = (projectId) => {
    setFormData((prev) => {
      const currentProjectIds = new Set(prev.project_ids);
      if (currentProjectIds.has(projectId)) {
        currentProjectIds.delete(projectId);
      } else {
        currentProjectIds.add(projectId);
      }
      return { ...prev, project_ids: Array.from(currentProjectIds) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { // Use the separate title state
      alert('Please enter a board title');
      return;
    }

    setLoading(true);
    try {
      const boardData = {
        title: title, // Use the separate title state
        description: description, // Use the separate description state
        project_ids: formData.project_ids, // Get project_ids from formData
        metric_status: formData.metric_status, // Get metric_status from formData
        columns: columns.map((col, index) => ({ ...col, order: index })),
        is_active: true // Always active upon creation/update
      };

      if (isEditing) {
        await ObeyaBoard.update(editBoardId, boardData);
      } else {
        await ObeyaBoard.create(boardData);
      }

      navigate(createPageUrl('ObeyaBoards'));
    } catch (error) {
      console.error('Error saving board:', error);
      alert('Error saving board. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // The 'selectedProjects' variable (array of project objects) is no longer directly needed for rendering badges
  // as the filtering is done inline with formData.project_ids.

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("ObeyaBoards")}>
            <Button variant="outline" size="icon" className="bg-purple-600 text-white hover:bg-purple-700"> {/* Updated class */}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Board' : 'Create New Board'}</h1>
            <p className="text-gray-600">Set up your visual project management board</p> {/* Kept existing description text */}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Board Details' : 'Board Configuration'}</CardTitle>
            <CardDescription>Configure your board settings and assign projects</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Board Title</Label>
                <Input
                  id="title"
                  value={title} // Use title state
                  onChange={(e) => setTitle(e.target.value)} // Set title state
                  placeholder="e.g., Q3 Product Launch" // Updated placeholder
                  required
                  disabled={loading} // Preserve disabled prop
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label> {/* Updated label text */}
                <Textarea
                  id="description"
                  value={description} // Use description state
                  onChange={(e) => setDescription(e.target.value)} // Set description state
                  placeholder="Briefly describe the purpose of this board" // Updated placeholder
                  rows={4} // Preserve original rows
                  disabled={loading} // Preserve disabled prop
                />
              </div>

              <div>
                <Label>Link Projects</Label> {/* Updated label text */}
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-black text-white hover:bg-gray-800 hover:text-white" // Updated classes
                      disabled={loading} // Preserve disabled prop
                    >
                      <div className="flex gap-2 flex-wrap items-center">
                        {formData.project_ids.length > 0 // Check if any project IDs are selected
                          ? projects
                              .filter((p) => formData.project_ids.includes(p.id)) // Filter projects based on selected IDs
                              .map((p) => <Badge key={p.id} variant="secondary">{p.name}</Badge>)
                          : "Select projects..."}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search projects..." className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 hover-none" /> {/* Preserving original class names */}
                      <CommandList>
                        <CommandEmpty>No projects found.</CommandEmpty>
                        <CommandGroup>
                          {projects.map((project) => ( // Renamed 'proj' to 'project' as per outline
                            <CommandItem
                              key={project.id}
                              onSelect={() => handleProjectSelection(project.id)} // Use updated handler name
                              value={project.name} // Added value prop
                              className="px-2 py-1.5 text-sm relative select-none rounded-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 flex items-center gap-3 cursor-pointer hover:border-white hover:border" // Preserving original class names
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.project_ids.includes(project.id) ? "opacity-100" : "opacity-0" // Updated check logic using formData.project_ids
                                }`}
                              />
                              {project.name} {/* Use project.name */}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-4">
                <Link to={createPageUrl("ObeyaBoards")}>
                  <Button type="button" variant="outline" className="bg-black text-white hover:bg-gray-800"> {/* Updated classes */}
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Update Board' : 'Create Board'}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
