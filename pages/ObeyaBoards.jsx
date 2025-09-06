
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ObeyaBoard } from '@/api/entities';
import { ObeyaCard } from '@/api/entities'; // Not used in the provided snippet, but keeping for completeness
import { Project } from '@/api/entities';
import { User } from '@/api/entities'; // Added User import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  LayoutGrid,
  MoreHorizontal,
  ArrowLeft // Added ArrowLeft import
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function ObeyaBoards() {
  const [boards, setBoards] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [user, setUser] = useState(null); // Added user state
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const [allBoards, allProjects] = await Promise.all([
          ObeyaBoard.list('-created_date').catch((error) => {
            console.error('Error loading boards:', error);
            return [];
          }),
          Project.list().catch((error) => {
            console.error('Error loading projects:', error);
            return [];
          })
        ]);
        setProjects(allProjects);

        if (currentUser.role === 'admin') {
          setBoards(allBoards);
        } else if (currentUser.title === 'Project Manager') {
          const pmProjects = allProjects.filter(p => p.project_manager_id === currentUser.id);
          const pmProjectIds = new Set(pmProjects.map(p => p.id));
          const accessibleBoards = allBoards.filter(board =>
            board.project_ids && board.project_ids.some(pId => pmProjectIds.has(pId))
          );
          setBoards(accessibleBoards);
        } else {
          setBoards([]); // No boards for other roles by default
        }
      } catch (error) {
        console.error("Error loading boards data:", error);
        setBoards([]);
      }
      setLoading(false);
    };

    loadData();
  }, []); // Dependency array remains empty

  const handleDelete = async (boardId, boardTitle) => {
    if (!confirm(`Are you sure you want to delete "${boardTitle}"? This action cannot be undone and will also delete all cards in this board.`)) {
      return;
    }

    setDeleteLoading(boardId);
    try {
      await ObeyaBoard.delete(boardId);
      // Re-call loadData from useEffect context to re-filter based on user's role
      const currentUser = await User.me(); // Fetch current user again to ensure latest role/id
      const [allBoards, allProjects] = await Promise.all([
        ObeyaBoard.list('-created_date').catch((error) => {
          console.error('Error loading boards after delete:', error);
          return [];
        }),
        Project.list().catch((error) => {
          console.error('Error loading projects after delete:', error);
          return [];
        })
      ]);
      setProjects(allProjects); // Update projects just in case

      if (currentUser.role === 'admin') {
        setBoards(allBoards);
      } else if (currentUser.title === 'Project Manager') {
        const pmProjects = allProjects.filter(p => p.project_manager_id === currentUser.id);
        const pmProjectIds = new Set(pmProjects.map(p => p.id));
        const accessibleBoards = allBoards.filter(board =>
          board.project_ids && board.project_ids.some(pId => pmProjectIds.has(pId))
        );
        setBoards(accessibleBoards);
      } else {
        setBoards([]);
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board. Please try again.');
    }
    setDeleteLoading(null);
  };

  const handleEdit = (board) => {
    navigate(createPageUrl(`CreateObeyaBoard?edit=${board.id}`));
  };

  const getProjectName = (projectIds) => {
    if (!projectIds || projectIds.length === 0) return 'No projects assigned';
    const projectNames = projectIds.
      map((id) => projects.find((p) => p.id === id)?.name || null)
      .filter((name) => name !== null);
    return projectNames.length > 0 ? projectNames.join(', ') : 'No projects assigned';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon" className="bg-purple-600 text-white hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Boards</h1>
              <p className="text-gray-600 mt-1">Visual project management boards</p>
            </div>
          </div>
          <Link to={createPageUrl('CreateObeyaBoard')}>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Board
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : boards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <LayoutGrid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
              <p className="text-gray-500 mb-6">Create your first board to get started with visual project management</p>
              <Link to={createPageUrl('CreateObeyaBoard')}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Board
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <Card key={board.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{board.title}</CardTitle>
                    {board.description && (
                      <p className="text-sm text-gray-600 mt-1">{board.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 bg-black text-white hover:bg-gray-800 hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black text-white">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(`CreateObeyaBoard?id=${board.id}&edit=true`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(board.id, board.title)}
                        disabled={deleteLoading === board.id}
                        className="text-red-400 hover:text-red-300"
                      >
                        {deleteLoading === board.id ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {board.columns?.length || 0} columns
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 
                          ${board.metric_status === 'green' ? 'bg-green-100 text-green-700 border-green-200' :
                           board.metric_status === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                           board.metric_status === 'red' ? 'bg-red-100 text-red-700 border-red-200' :
                           'bg-gray-100 text-gray-700 border-gray-200' // Default if status is not recognized
                         }`}
                      >
                        {board.metric_status || 'unknown'} status
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Projects:</p>
                      <p className="text-sm font-medium text-gray-700">
                        {getProjectName(board.project_ids)}
                      </p>
                    </div>

                    <div className="pt-3">
                      <Link to={createPageUrl(`ObeyaBoard?id=${board.id}`)}>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                          <LayoutGrid className="w-4 h-4 mr-2" />
                          Open Board
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
