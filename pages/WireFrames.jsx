import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WireFrame } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  PenSquare,
  ArrowLeft,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function WireFrames() {
  const [wireframes, setWireframes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const allWireframes = await WireFrame.list('-created_date');
      setWireframes(allWireframes);
    } catch (error) {
      console.error("Error loading wireframes:", error);
      setWireframes([]);
    }
    setLoading(false);
  };

  const handleDelete = async (wireframeId, wireframeTitle) => {
    if (!confirm(`Are you sure you want to delete "${wireframeTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(wireframeId);
    try {
      await WireFrame.delete(wireframeId);
      loadData();
    } catch (error) {
      console.error('Error deleting wireframe:', error);
      alert('Failed to delete wireframe. Please try again.');
    }
    setDeleteLoading(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Wireframes</h1>
            <p className="text-gray-300 mt-1">Design and prototype your interfaces</p>
          </div>
          <Link to={createPageUrl('CreateWireFrame')}>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Wireframe
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : wireframes.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700 text-center py-12">
            <CardContent>
              <PenSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No wireframes yet</h3>
              <p className="text-gray-400 mb-6">Create your first wireframe to start prototyping</p>
              <Link to={createPageUrl('CreateWireFrame')}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Wireframe
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wireframes.map((wireframe) => (
              <Card key={wireframe.id} className="bg-slate-900 border-slate-700 hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-white">{wireframe.title}</CardTitle>
                    {wireframe.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{wireframe.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 bg-black text-white hover:bg-gray-800">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black text-white border-white">
                      <DropdownMenuItem asChild className="hover:bg-gray-800">
                        <Link to={createPageUrl(`CreateWireFrame?edit=${wireframe.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(wireframe.id, wireframe.title)}
                        className="hover:bg-gray-800 text-red-400"
                        disabled={deleteLoading === wireframe.id}
                      >
                        {deleteLoading === wireframe.id ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {wireframe.width} × {wireframe.height}
                      </Badge>
                      {wireframe.created_by_name && (
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                          by {wireframe.created_by_name}
                        </Badge>
                      )}
                    </div>

                    {wireframe.thumbnail_url && (
                      <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                        <img
                          src={wireframe.thumbnail_url}
                          alt={wireframe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Created:</p>
                      <p className="text-sm font-medium text-gray-300">
                        {wireframe.created_date ? format(new Date(wireframe.created_date), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>

                    <div className="pt-3">
                      <Link to={createPageUrl(`CreateWireFrame?edit=${wireframe.id}`)}>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                          <PenSquare className="w-4 h-4 mr-2" />
                          Edit Wireframe
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