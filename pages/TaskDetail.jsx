import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { TimelineItem } from "@/api/entities";
import { User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Save, Upload, Download, Trash2, Calendar as CalendarIcon, FileText, Send } from "lucide-react";
import { format } from "date-fns";

export default function TaskDetail() {
  const location = useLocation();
  const taskId = new URLSearchParams(location.search).get("id");
  
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadData();
    }
  }, [taskId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentUserData, allUsers] = await Promise.all([
        User.me(),
        User.list()
      ]);
      
      setCurrentUser(currentUserData);
      setUsers(allUsers);

      // Load the specific timeline item
      const timelineItems = await TimelineItem.filter({ id: taskId });
      if (timelineItems.length > 0) {
        setTask(timelineItems[0]);
      } else {
        console.error("Task not found");
      }
    } catch (error) {
      console.error("Error loading task data:", error);
    }
    setLoading(false);
  };

  const handleUpdateTask = (field, value) => {
    setTask(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!task) return;
    
    setSaving(true);
    try {
      await TimelineItem.update(task.id, {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        assigned_to: task.assigned_to,
        is_completed: task.is_completed
      });
      
      // Reload task to get updated data
      const updatedTasks = await TimelineItem.filter({ id: taskId });
      if (updatedTasks.length > 0) {
        setTask(updatedTasks[0]);
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Error saving task. Please try again.");
    }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      const currentFiles = task.file_urls || [];
      const updatedFiles = [...currentFiles, file_url];
      
      await TimelineItem.update(task.id, { file_urls: updatedFiles });
      setTask(prev => ({ ...prev, file_urls: updatedFiles }));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    }
    setUploading(false);
  };

  const handleDeleteFile = async (fileUrl) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const currentFiles = task.file_urls || [];
      const updatedFiles = currentFiles.filter(url => url !== fileUrl);
      
      await TimelineItem.update(task.id, { file_urls: updatedFiles });
      setTask(prev => ({ ...prev, file_urls: updatedFiles }));
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file. Please try again.");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    setAddingComment(true);
    try {
      const currentComments = task.comments || [];
      const newCommentObj = {
        user_id: currentUser.id,
        message: newComment.trim(),
        timestamp: new Date().toISOString()
      };
      const updatedComments = [...currentComments, newCommentObj];

      await TimelineItem.update(task.id, { comments: updatedComments });
      setTask(prev => ({ ...prev, comments: updatedComments }));
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Error adding comment. Please try again.");
    }
    setAddingComment(false);
  };

  const getFileName = (url) => {
    try {
      return url.split('/').pop().split('?')[0];
    } catch {
      return 'File';
    }
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Task not found</h2>
          <p className="text-gray-600 mb-4">The requested task could not be found.</p>
          <Link to={createPageUrl("Dashboard")}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const assignedUser = getUserById(task.assigned_to);
  const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.title === 'Project Manager' || task.assigned_to === currentUser.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="text-purple-600 border-purple-600 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Details</h1>
            <p className="text-gray-600">Manage task information and progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={task.title}
                    onChange={(e) => handleUpdateTask('title', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={task.description || ''}
                    onChange={(e) => handleUpdateTask('description', e.target.value)}
                    rows={4}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start" disabled={!canEdit}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {task.due_date ? format(new Date(task.due_date), 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={task.due_date ? new Date(task.due_date) : undefined}
                          onSelect={(date) => handleUpdateTask('due_date', date?.toISOString().split('T')[0])}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Assigned To</Label>
                    <Select 
                      value={task.assigned_to || ''} 
                      onValueChange={(value) => handleUpdateTask('assigned_to', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="completed"
                    checked={task.is_completed || false}
                    onCheckedChange={(checked) => handleUpdateTask('is_completed', checked)}
                    disabled={!canEdit}
                  />
                  <Label htmlFor="completed">Mark as completed</Label>
                </div>

                {canEdit && (
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files Section */}
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit && (
                  <div className="mb-4">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <Button asChild variant="outline" disabled={uploading}>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </Button>
                  </div>
                )}

                {task.file_urls && task.file_urls.length > 0 ? (
                  <div className="space-y-2">
                    {task.file_urls.map((fileUrl, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <span className="text-sm font-medium">{getFileName(fileUrl)}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                            <Download className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(fileUrl)} className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No files attached</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${task.is_completed ? 'text-green-600' : 'text-orange-600'}`}>
                      {task.is_completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  
                  {assignedUser && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Assigned to</span>
                      <span className="font-medium">
                        {assignedUser.first_name} {assignedUser.last_name}
                      </span>
                    </div>
                  )}

                  {task.due_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Due Date</span>
                      <span className="font-medium">
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment, index) => {
                      const commentUser = getUserById(comment.user_id);
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              {commentUser ? `${commentUser.first_name} ${commentUser.last_name}` : 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.timestamp), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No comments yet</p>
                  )}

                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addingComment}
                      size="sm"
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}