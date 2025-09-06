
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { KnowledgeArticle } from '@/api/entities';
import { KnowledgeVideo } from '@/api/entities';
import { KnowledgeFAQ } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Plus, Edit, Trash2, BookOpen, PlayCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const quillModules = {
  toolbar: [
    [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
    [{size: []}],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    }
    return null;
}

export default function AdminKnowledgeBase() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('article'); // 'article', 'video', or 'faq'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentUser, articlesData, videosData, faqsData] = await Promise.all([
        User.me(),
        KnowledgeArticle.list('-created_date'),
        KnowledgeVideo.list('-created_date'),
        KnowledgeFAQ.list('order')
      ]);

      const canAccess = currentUser.role === 'admin' || currentUser.title === 'Admin' || currentUser.title === 'Project Manager';

      if (!canAccess) {
        window.location.href = createPageUrl('Dashboard');
        return;
      }

      setUser(currentUser);
      setArticles(articlesData);
      setVideos(videosData);
      setFaqs(faqsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      setFormData({ ...item });
    } else {
      const defaultData = {
        article: { title: '', content: '', category: '', author_name: user?.full_name || 'Admin', read_time: 5, tags: [], is_published: false },
        video: { title: '', description: '', video_url: '', thumbnail_url: '', category: '', level: 'Beginner', tags: [], is_published: false },
        faq: { question: '', answer: '', category: '', order: 0, is_published: false },
      };
      setFormData(defaultData[type]);
    }
    setShowModal(true);
  };

  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    if (field === 'video_url') {
      const youtubeId = getYouTubeId(value);
      if (youtubeId) {
        newFormData.thumbnail_url = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      } else {
        newFormData.thumbnail_url = ''; // Clear thumbnail if URL is not valid YouTube
      }
    }
    
    setFormData(newFormData);
  };
  
  const handleContentChange = (value) => {
    setFormData(prev => ({...prev, [modalType === 'article' ? 'content' : 'answer']: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const entityMap = {
      article: KnowledgeArticle,
      video: KnowledgeVideo,
      faq: KnowledgeFAQ,
    };
    const Entity = entityMap[modalType];

    // Ensure author name is set for new articles
    const dataToSave = { ...formData };
    if (!editingItem && modalType === 'article') {
      dataToSave.author_name = user?.full_name || 'Admin';
    }

    try {
      if (editingItem) {
        await Entity.update(editingItem.id, dataToSave);
        toast({ title: "Success", description: `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} updated.` });
      } else {
        await Entity.create(dataToSave);
        toast({ title: "Success", description: `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} created.` });
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error(`Error saving ${modalType}:`, error);
      toast({ title: "Error", description: `Failed to save ${modalType}.`, variant: "destructive" });
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item permanently?')) return;
    const entityMap = {
      article: KnowledgeArticle,
      video: KnowledgeVideo,
      faq: KnowledgeFAQ,
    };
    const Entity = entityMap[type];

    try {
      await Entity.delete(id);
      toast({ title: "Success", description: "Item deleted." });
      loadData();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    }
  };

  const renderArticleForm = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={formData.title || ''} onChange={e => handleFormChange('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={formData.category || ''} onChange={e => handleFormChange('category', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="read_time">Read Time (minutes)</Label>
        <Input id="read_time" type="number" value={formData.read_time || 5} onChange={e => handleFormChange('read_time', parseInt(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <ReactQuill theme="snow" modules={quillModules} value={formData.content || ''} onChange={handleContentChange} style={{ height: '250px', marginBottom: '4rem' }} />
      </div>
    </>
  );

  const renderVideoForm = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={formData.title || ''} onChange={e => handleFormChange('title', e.target.value)} />
      </div>
       <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description || ''} onChange={e => handleFormChange('description', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL (YouTube)</Label>
        <Input id="video_url" value={formData.video_url || ''} onChange={e => handleFormChange('video_url', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL (Optional)</Label>
        <Input id="thumbnail_url" value={formData.thumbnail_url || ''} onChange={e => handleFormChange('thumbnail_url', e.target.value)} />
        {formData.thumbnail_url && (
            <div className="mt-2">
                <img src={formData.thumbnail_url} alt="Thumbnail preview" className="rounded-lg w-full max-w-xs object-cover"/>
            </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={formData.category || ''} onChange={e => handleFormChange('category', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="level">Level</Label>
        <Select value={formData.level || 'Beginner'} onValueChange={value => handleFormChange('level', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Beginner">Beginner</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderFaqForm = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="question">Question</Label>
        <Input id="question" value={formData.question || ''} onChange={e => handleFormChange('question', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Answer</Label>
        <ReactQuill theme="snow" modules={quillModules} value={formData.answer || ''} onChange={handleContentChange} style={{ height: '200px', marginBottom: '4rem' }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={formData.category || ''} onChange={e => handleFormChange('category', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="order">Order</Label>
        <Input id="order" type="number" value={formData.order || 0} onChange={e => handleFormChange('order', parseInt(e.target.value))} />
      </div>
    </>
  );
  
  const renderTable = (type, data) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="capitalize">{type}s</CardTitle>
                <Button onClick={() => handleOpenModal(type)}><Plus className="w-4 h-4 mr-2" /> Add {type}</Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title / Question</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title || item.question}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                                <Badge variant={item.is_published ? "default" : "secondary"}>
                                    {item.is_published ? "Yes" : "No"}
                                </Badge>
                            </TableCell>
                            <TableCell className="space-x-2">
                                <Button variant="outline" size="icon" onClick={() => handleOpenModal(type, item)}><Edit className="w-4 h-4"/></Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(type, item.id)}><Trash2 className="w-4 h-4"/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("KnowledgeBase")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Knowledge Base</h1>
            <p className="text-muted-foreground">Create, edit, and manage all help content.</p>
          </div>
        </div>

        <Tabs defaultValue="articles">
            <TabsList className="mb-4">
                <TabsTrigger value="articles"><BookOpen className="w-4 h-4 mr-2"/>Articles</TabsTrigger>
                <TabsTrigger value="videos"><PlayCircle className="w-4 h-4 mr-2"/>Videos</TabsTrigger>
                <TabsTrigger value="faqs"><HelpCircle className="w-4 h-4 mr-2"/>FAQs</TabsTrigger>
            </TabsList>
            <TabsContent value="articles">{renderTable('article', articles)}</TabsContent>
            <TabsContent value="videos">{renderTable('video', videos)}</TabsContent>
            <TabsContent value="faqs">{renderTable('faq', faqs)}</TabsContent>
        </Tabs>
        
        <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit' : 'Add'} {modalType}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {modalType === 'article' && renderArticleForm()}
                    {modalType === 'video' && renderVideoForm()}
                    {modalType === 'faq' && renderFaqForm()}
                    <div className="flex items-center space-x-2">
                      <Switch id="is_published" checked={formData.is_published || false} onCheckedChange={(checked) => handleFormChange('is_published', checked)} />
                      <Label htmlFor="is_published">Publish</Label>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
