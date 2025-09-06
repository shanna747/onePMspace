import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { WireFrame } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import {
  Square,
  Type,
  Image as ImageIcon,
  Save,
  Download,
  Trash2,
  MousePointer,
  ArrowLeft,
  ArrowRight,
  Minus,
  Palette
} from 'lucide-react';

const WireframeToolbar = ({ addShape, activeTool, setActiveTool }) => {
  const tools = [
    { name: 'select', icon: MousePointer },
    { name: 'rect', icon: Square },
    { name: 'text', icon: Type },
    { name: 'image', icon: ImageIcon },
    { name: 'arrow', icon: ArrowRight },
    { name: 'line', icon: Minus },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 border">
      {tools.map(({ name, icon: Icon }) => (
        <Button
          key={name}
          variant={activeTool === name ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            setActiveTool(name);
          }}
          title={`${name === 'select' ? 'Select' : 'Add ' + name}`}
        >
          <Icon className="h-5 w-5" />
        </Button>
      ))}
    </div>
  );
};

const PropertiesPanel = ({ selectedObject, updateObject, removeObject }) => {
  if (!selectedObject) {
    return (
      <div className="w-64 bg-white p-4 border-l">
        <h3 className="text-lg font-semibold mb-4">Properties</h3>
        <p className="text-sm text-gray-500">Select an element to edit its properties</p>
      </div>
    );
  }

  const handleInputChange = (prop, value) => {
    updateObject({ [prop]: value });
  };
  
  const type = selectedObject.type;

  return (
    <div className="w-64 bg-white p-4 border-l overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Properties</h3>
      <div className="space-y-4">
        {/* Position and Size for shapes */}
        {(type === 'rect' || type === 'image') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>X</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.x || 0)}
                  onChange={(e) => handleInputChange('x', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.y || 0)}
                  onChange={(e) => handleInputChange('y', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Width</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.width || 0)}
                  onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Height</Label>
                <Input
                  type="number"
                  value={Math.round(selectedObject.height || 0)}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Fill Color */}
        {(type === 'rect' || type === 'image' || type === 'text') && (
          <div>
            <Label>Fill Color</Label>
            <Input
              type="color"
              value={selectedObject.fillColor || '#cccccc'}
              onChange={(e) => handleInputChange('fillColor', e.target.value)}
            />
          </div>
        )}

        {/* Text Properties */}
        {type === 'text' && (
          <>
            <div>
              <Label>Text</Label>
              <Textarea
                value={selectedObject.text || ''}
                onChange={(e) => handleInputChange('text', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Font Size</Label>
              <Input
                type="number"
                value={selectedObject.fontSize || 16}
                onChange={(e) => handleInputChange('fontSize', parseInt(e.target.value) || 16)}
              />
            </div>
          </>
        )}

        {/* Stroke Color for shapes and lines */}
        {(type === 'rect' || type === 'image' || type === 'arrow' || type === 'line') && (
          <div>
            <Label>Stroke Color</Label>
            <Input
              type="color"
              value={selectedObject.strokeColor || '#000000'}
              onChange={(e) => handleInputChange('strokeColor', e.target.value)}
            />
          </div>
        )}

        {/* Stroke Width for lines and arrows */}
        {(type === 'arrow' || type === 'line') && (
          <div>
            <Label>Line Width</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={selectedObject.strokeWidth || 2}
              onChange={(e) => handleInputChange('strokeWidth', parseInt(e.target.value) || 2)}
            />
          </div>
        )}

        <Button variant="destructive" onClick={removeObject} className="w-full">
          <Trash2 className="h-4 w-4 mr-2" /> Delete Element
        </Button>
      </div>
    </div>
  );
};

export default function CreateWireFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const wireframeId = new URLSearchParams(location.search).get('id');
  
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('Untitled Wireframe');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [elements, setElements] = useState([]);
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  const [lineStart, setLineStart] = useState(null);
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    User.me().then(setUser);
    if (wireframeId) {
      loadWireframe();
    }
  }, [wireframeId]);

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedObject, isDrawingLine, currentMousePos, lineStart]);

  const loadWireframe = async () => {
    setLoading(true);
    try {
      const results = await WireFrame.filter({ id: wireframeId });
      if (results.length > 0) {
        const data = results[0];
        setTitle(data.title);
        if (data.canvas_data) {
          const parsedElements = JSON.parse(data.canvas_data);
          setElements(parsedElements);
        }
      }
    } catch (error) {
      console.error('Failed to load wireframe:', error);
    }
    setLoading(false);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw elements
    elements.forEach((element) => {
      drawElement(ctx, element, element === selectedObject);
    });

    // Draw temporary line while drawing
    if (isDrawingLine && lineStart) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(currentMousePos.x, currentMousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawElement = (ctx, element, isSelected) => {
    ctx.save();
    
    switch (element.type) {
      case 'rect':
        ctx.fillStyle = element.fillColor || '#cccccc';
        ctx.strokeStyle = element.strokeColor || '#333333';
        ctx.lineWidth = 2;
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;
        
      case 'text':
        ctx.fillStyle = element.fillColor || '#333333';
        ctx.font = `${element.fontSize || 16}px Arial`;
        const lines = (element.text || 'Text').split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, element.x, element.y + (element.fontSize || 16) * (index + 1));
        });
        break;
        
      case 'image':
        ctx.fillStyle = element.fillColor || '#e0e0e0';
        ctx.strokeStyle = element.strokeColor || '#999999';
        ctx.lineWidth = 2;
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Draw image placeholder
        ctx.fillStyle = '#666666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('IMAGE', element.x + element.width/2, element.y + element.height/2);
        ctx.textAlign = 'left';
        break;

      case 'line':
        ctx.strokeStyle = element.strokeColor || '#333333';
        ctx.lineWidth = element.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
        break;

      case 'arrow':
        ctx.strokeStyle = element.strokeColor || '#333333';
        ctx.fillStyle = element.strokeColor || '#333333';
        ctx.lineWidth = element.strokeWidth || 2;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        ctx.beginPath();
        ctx.moveTo(element.x2, element.y2);
        ctx.lineTo(
          element.x2 - arrowLength * Math.cos(angle - arrowAngle),
          element.y2 - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(element.x2, element.y2);
        ctx.lineTo(
          element.x2 - arrowLength * Math.cos(angle + arrowAngle),
          element.y2 - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
        break;
    }
    
    // Draw selection outline and resize handles for shapes
    if (isSelected && (element.type === 'rect' || element.type === 'image')) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
      ctx.setLineDash([]);
      
      // Draw resize handles
      const handleSize = 8;
      ctx.fillStyle = '#7c3aed';
      const handles = [
        { x: element.x - handleSize/2, y: element.y - handleSize/2, cursor: 'nw-resize', handle: 'nw' },
        { x: element.x + element.width - handleSize/2, y: element.y - handleSize/2, cursor: 'ne-resize', handle: 'ne' },
        { x: element.x - handleSize/2, y: element.y + element.height - handleSize/2, cursor: 'sw-resize', handle: 'sw' },
        { x: element.x + element.width - handleSize/2, y: element.y + element.height - handleSize/2, cursor: 'se-resize', handle: 'se' },
      ];
      
      handles.forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      });
    }
    
    // Draw selection outline for lines and arrows
    if (isSelected && (element.type === 'line' || element.type === 'arrow')) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(element.x1, element.y1);
      ctx.lineTo(element.x2, element.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
  };

  const getResizeHandle = (x, y, element) => {
    if (!element || (element.type !== 'rect' && element.type !== 'image')) return null;
    
    const handleSize = 8;
    const handles = [
      { x: element.x - handleSize/2, y: element.y - handleSize/2, handle: 'nw' },
      { x: element.x + element.width - handleSize/2, y: element.y - handleSize/2, handle: 'ne' },
      { x: element.x - handleSize/2, y: element.y + element.height - handleSize/2, handle: 'sw' },
      { x: element.x + element.width - handleSize/2, y: element.y + element.height - handleSize/2, handle: 'se' },
    ];
    
    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + handleSize && 
          y >= handle.y && y <= handle.y + handleSize) {
        return handle.handle;
      }
    }
    return null;
  };

  const getElementAtPosition = (x, y) => {
    // Check elements in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'rect' || element.type === 'image') {
        if (x >= element.x && x <= element.x + element.width &&
            y >= element.y && y <= element.y + element.height) {
          return element;
        }
      } else if (element.type === 'text') {
        // Simple text bounds check
        const textWidth = (element.text || 'Text').length * (element.fontSize || 16) * 0.6;
        const textHeight = (element.fontSize || 16);
        if (x >= element.x && x <= element.x + textWidth &&
            y >= element.y && y <= element.y + textHeight) {
          return element;
        }
      } else if (element.type === 'line' || element.type === 'arrow') {
        // Check if click is near the line
        const distance = distanceToLine(x, y, element.x1, element.y1, element.x2, element.y2);
        if (distance < 10) {
          return element;
        }
      }
    }
    return null;
  };

  const distanceToLine = (x, y, x1, y1, x2, y2) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'select') {
      const clickedElement = getElementAtPosition(x, y);
      
      if (clickedElement) {
        setSelectedObject(clickedElement);
        
        // Check for resize handle
        const handle = getResizeHandle(x, y, clickedElement);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
        } else {
          setIsDragging(true);
          setDragOffset({
            x: x - clickedElement.x,
            y: y - clickedElement.y
          });
        }
      } else {
        setSelectedObject(null);
      }
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      if (!isDrawingLine) {
        setIsDrawingLine(true);
        setLineStart({ x, y });
      } else {
        // Finish drawing line
        const newElement = {
          id: Date.now().toString(),
          type: activeTool,
          x1: lineStart.x,
          y1: lineStart.y,
          x2: x,
          y2: y,
          strokeColor: '#333333',
          strokeWidth: 2
        };
        setElements(prev => [...prev, newElement]);
        setIsDrawingLine(false);
        setLineStart(null);
        setActiveTool('select');
      }
    } else {
      // Add new shape
      addShape(activeTool, x, y);
      setActiveTool('select');
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentMousePos({ x, y });

    if (isDragging && selectedObject) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      updateObject({ x: newX, y: newY });
    } else if (isResizing && selectedObject && resizeHandle) {
      const element = selectedObject;
      let newProps = {};
      
      switch (resizeHandle) {
        case 'nw':
          newProps = {
            x: x,
            y: y,
            width: element.width + (element.x - x),
            height: element.height + (element.y - y)
          };
          break;
        case 'ne':
          newProps = {
            y: y,
            width: x - element.x,
            height: element.height + (element.y - y)
          };
          break;
        case 'sw':
          newProps = {
            x: x,
            width: element.width + (element.x - x),
            height: y - element.y
          };
          break;
        case 'se':
          newProps = {
            width: x - element.x,
            height: y - element.y
          };
          break;
      }
      
      // Ensure minimum size
      if (newProps.width < 10) newProps.width = 10;
      if (newProps.height < 10) newProps.height = 10;
      
      updateObject(newProps);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const addShape = (shape, x = 100, y = 100) => {
    let newElement;
    const id = Date.now().toString();
    
    switch (shape) {
      case 'rect':
        newElement = {
          id,
          type: 'rect',
          x: x - 100,
          y: y - 50,
          width: 200,
          height: 100,
          fillColor: '#cccccc',
          strokeColor: '#333333'
        };
        break;
      case 'text':
        newElement = {
          id,
          type: 'text',
          x: x - 50,
          y: y - 8,
          text: 'Your Text Here',
          fillColor: '#333333',
          fontSize: 16
        };
        break;
      case 'image':
        newElement = {
          id,
          type: 'image',
          x: x - 100,
          y: y - 75,
          width: 200,
          height: 150,
          fillColor: '#e0e0e0',
          strokeColor: '#999999'
        };
        break;
      default:
        return;
    }
    
    setElements(prev => [...prev, newElement]);
    setSelectedObject(newElement);
  };

  const updateObject = (props) => {
    if (!selectedObject) return;
    
    const updatedObject = { ...selectedObject, ...props };
    setElements(prev => 
      prev.map(el => el.id === selectedObject.id ? updatedObject : el)
    );
    setSelectedObject(updatedObject);
  };

  const removeObject = () => {
    if (!selectedObject) return;
    
    setElements(prev => prev.filter(el => el.id !== selectedObject.id));
    setSelectedObject(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const canvasData = JSON.stringify(elements);
    
    try {
      if (wireframeId) {
        await WireFrame.update(wireframeId, { title, canvas_data: canvasData });
      } else {
        const newWireframe = await WireFrame.create({ 
          title, 
          canvas_data: canvasData,
          created_by_name: user?.full_name || user?.first_name || 'User'
        });
        navigate(createPageUrl(`CreateWireFrame?id=${newWireframe.id}`));
      }
      alert('Wireframe saved successfully!');
    } catch (error) {
      console.error('Failed to save wireframe:', error);
      alert('Error saving wireframe.');
    }
    setSaving(false);
  };
  
  const handleExport = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b p-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('WireFrames')}>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4"/></Button>
          </Link>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="text-lg font-semibold" 
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2"/> {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2"/> Export PNG
          </Button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-slate-200 overflow-auto">
          <WireframeToolbar 
            addShape={addShape} 
            activeTool={activeTool} 
            setActiveTool={setActiveTool} 
          />
          <div className="p-8">
            <canvas 
              ref={canvasRef} 
              width={1920} 
              height={1080}
              className="shadow-lg bg-white cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>
        </div>
        <PropertiesPanel 
          selectedObject={selectedObject} 
          updateObject={updateObject} 
          removeObject={removeObject} 
        />
      </div>
    </div>
  );
}