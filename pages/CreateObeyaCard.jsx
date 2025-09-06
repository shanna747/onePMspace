
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ObeyaCard } from '@/api/entities';
import { User } from '@/api/entities';
import { ObeyaBoard } from '@/api/entities';
import { ObeyaColumn } from '@/api/entities/ObeyaColumn';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  ArrowLeft,
  Save,
  Pen,
  Trash2 } from
'lucide-react';
import { createPageUrl } from '@/utils';

export default function CreateObeyaCard() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const boardId = searchParams.get('boardId');
  const columnIdParam = searchParams.get('columnId');

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState(null);

  const [currentTool, setCurrentTool] = useState('pen');

  const [users, setUsers] = useState([]);
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    column_id: columnIdParam || ''
  });

  const [showDrawingBoard, setShowDrawingBoard] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [currentTextStyle, setCurrentTextStyle] = useState({
    fontSize: 16,
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Re-initialize/redraw canvas when elements change or visibility toggles
    if (showDrawingBoard) {
      initializeCanvas();
    }
  }, [showDrawingBoard, uploadedImages, textElements]);


  const loadInitialData = async () => {
    try {
      const userList = await User.list();
      setUsers(userList);

      if (boardId) {
        const boardData = await ObeyaBoard.filter({ id: boardId });
        if (boardData && boardData.length > 0) {
          const fetchedBoard = boardData[0];
          setBoard(fetchedBoard);

          const fetchedColumns = fetchedBoard.columns || [];
          const sortedColumns = fetchedColumns.sort((a, b) => a.order - b.order);
          setColumns(sortedColumns);

          if (columnIdParam && sortedColumns.some((col) => col.id === columnIdParam)) {
            setFormData((prev) => ({ ...prev, column_id: columnIdParam }));
          } else if (sortedColumns.length > 0) {
            setFormData((prev) => ({ ...prev, column_id: sortedColumns[0].id }));
          }
        } else {
          console.error(`Board with id ${boardId} not found.`);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear existing content
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw uploaded images
    uploadedImages.forEach((img) => {
      if (img.element && img.element.complete) {
        ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
      }
    });

    // Redraw text elements
    textElements.forEach((text) => {
      ctx.font = `${text.fontWeight} ${text.fontStyle} ${text.fontSize}px Arial`;
      ctx.fillStyle = text.color;
      ctx.textAlign = 'center'; // Text elements store their own x, y, but for consistent re-draw, center them.
      ctx.fillText(text.text, text.x, text.y);
    });
    ctx.textAlign = 'left'; // Reset default alignment
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await UploadFile({ file });
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Calculate position to center the image, maintaining aspect ratio
        const maxWidth = canvas.width * 0.8; // Max 80% of canvas width
        const maxHeight = canvas.height * 0.8; // Max 80% of canvas height

        let newWidth = img.width;
        let newHeight = img.height;

        if (newWidth > maxWidth) {
          newHeight = newHeight * maxWidth / newWidth;
          newWidth = maxWidth;
        }
        if (newHeight > maxHeight) {
          newWidth = newWidth * maxHeight / newHeight;
          newHeight = maxHeight;
        }

        const x = (canvas.width - newWidth) / 2;
        const y = (canvas.height - newHeight) / 2;

        ctx.drawImage(img, x, y, newWidth, newHeight);

        setUploadedImages((prev) => [...prev, {
          url: result.file_url,
          element: img,
          x: x,
          y: y,
          width: newWidth,
          height: newHeight
        }]);
      };
      img.src = result.file_url;
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const addTextToCanvas = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Add text in center of canvas
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    setTextElements((prev) => [...prev, {
      text: text,
      x: x,
      y: y,
      ...currentTextStyle
    }]);
    // The useEffect for uploadedImages/textElements will call initializeCanvas to redraw.
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e) => {
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    setStartX(x);
    setStartY(y);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.putImageData(snapshot, 0, 0); // Restore the canvas to the state before the current stroke

    if (currentTool === 'pen') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === 'rectangle') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a card title');
      return;
    }
    if (!formData.column_id) {
      alert('Please select a column');
      return;
    }

    setLoading(true);

    try {
      let drawingUrl = '';
      if (showDrawingBoard && canvasRef.current) {
        const canvas = canvasRef.current;
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (blob && blob.size > 0) {
          try {
            const file = new File([blob], 'drawing.png', { type: 'image/png' });
            const result = await UploadFile({ file });
            drawingUrl = result.file_url;
          } catch (error) {
            console.error('Error uploading drawing:', error);
          }
        }
      }

      const assignedUser = users.find((u) => u.id === formData.assigned_to);
      const assignedToName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : '';

      await ObeyaCard.create({
        board_id: boardId,
        column_id: formData.column_id,
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assigned_to || null,
        assigned_to_name: assignedToName,
        priority: formData.priority,
        due_date: formData.due_date || null,
        tags: [],
        order: Date.now(),
        attachments: drawingUrl ? [{ url: drawingUrl, name: 'drawing.png', type: 'image/png' }] : [],
        comments: []
      });

      navigate(createPageUrl(`ObeyaBoard?id=${boardId}`));
    } catch (error) {
      console.error('Error creating card:', error);
      alert('Error creating card. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl(`ObeyaBoard?id=${boardId}`)}>
              <Button variant="outline" size="icon" className="bg-purple-600 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 w-10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create New Card</h1>
              <p className="text-gray-600">Add a new card to {board?.title || 'this board'}</p>
            </div>
          </div>

          {/* Card Details Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Card Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter card title..." className="bg-slate-50 mt-1 px-3 py-2 text-base flex h-10 w-full rounded-md border border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />


                </div>
                <div>
                  <Label htmlFor="column">Column *</Label>
                  <Select
                    value={formData.column_id}
                    onValueChange={(value) => setFormData({ ...formData, column_id: value })}>

                    <SelectTrigger className="bg-slate-900 mt-1 px-3 py-2 text-sm flex h-10 w-full items-center justify-between rounded-md border border-input ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) =>
                      <SelectItem key={column.id} value={column.id}>
                          {column.title}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <div className="mt-1">
                  <ReactQuill
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    style={{ height: '120px', marginBottom: '42px' }}
                    theme="snow"
                    placeholder="Describe the card..." />

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="assignee">Assigned To</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => {
                      const user = users.find((u) => u.id === value);
                      setFormData({
                        ...formData,
                        assigned_to: value,
                        assigned_to_name: user ? `${user.first_name} ${user.last_name}` : ''
                      });
                    }}>

                    <SelectTrigger className="bg-slate-950 mt-1 px-3 py-2 text-sm flex h-10 w-full items-center justify-between rounded-md border border-input ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Unassigned</SelectItem>
                      {users.map((user) =>
                      <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}>

                    <SelectTrigger className="bg-slate-950 mt-1 px-3 py-2 text-sm flex h-10 w-full items-center justify-between rounded-md border border-input ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1" />

                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link to={createPageUrl(`ObeyaBoard?id=${boardId}`)}>
                  <Button variant="outline" className="bg-slate-950 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10">Cancel</Button>
                </Link>
                <Button
                  onClick={handleSave}
                  disabled={loading || !formData.title.trim() || !formData.column_id}
                  className="bg-purple-600 hover:bg-purple-700 text-white">

                  {loading ?
                  <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </div> :

                  <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Create Card
                    </div>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Drawing Board */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Visual Attachments (Optional)</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowDrawingBoard(!showDrawingBoard)} className="bg-slate-950 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10">

                  {showDrawingBoard ? 'Hide Drawing Board' : 'Show Drawing Board'}
                </Button>
              </div>
            </CardHeader>
            {showDrawingBoard &&
            <CardContent>
                <div className="space-y-4">
                  {/* Drawing Tools */}
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                    <Button
                    variant={currentTool === 'pen' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentTool('pen')}>

                      <Pen className="w-4 h-4 mr-1" />Pen
                    </Button>
                    <Button
                    variant={currentTool === 'rectangle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentTool('rectangle')}>

                      Rectangle
                    </Button>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      setUploadedImages([]); // Clear state for uploaded images
                      setTextElements([]); // Clear state for text elements
                    }}>

                      <Trash2 className="w-4 h-4 mr-1" />Clear
                    </Button>

                    {/* Image Upload */}
                    <div>
                      <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload" />

                      <Button variant="outline" size="sm" onClick={() => document.getElementById('image-upload').click()}>
                        Upload Image
                      </Button>
                    </div>

                    {/* Text Tools */}
                    <div className="flex items-center gap-2 border-l pl-2 ml-2">
                      <Input
                      placeholder="Add text..."
                      className="w-32 h-8"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          addTextToCanvas(e.target.value.trim());
                          e.target.value = '';
                        }
                      }} />

                      <Select value={currentTextStyle.fontSize.toString()} onValueChange={(value) => setCurrentTextStyle((prev) => ({ ...prev, fontSize: parseInt(value) }))}>
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12px</SelectItem>
                          <SelectItem value="16">16px</SelectItem>
                          <SelectItem value="20">20px</SelectItem>
                          <SelectItem value="24">24px</SelectItem>
                          <SelectItem value="32">32px</SelectItem>
                        </SelectContent>
                      </Select>
                      <input
                      type="color"
                      value={currentTextStyle.color}
                      onChange={(e) => setCurrentTextStyle((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 border rounded" />

                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="border rounded-lg p-4 bg-white">
                    <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="border border-gray-200 rounded cursor-crosshair w-full h-auto max-w-full"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp} />

                  </div>
                </div>
              </CardContent>
            }
          </Card>
        </div>
      </div>
    </div>);

}