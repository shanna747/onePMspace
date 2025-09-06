
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities'; // Added User import
import { KnowledgeArticle } from '@/api/entities';
import { KnowledgeVideo } from '@/api/entities';
import { KnowledgeFAQ } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  PlayCircle,
  HelpCircle,
  Search,
  ArrowRight,
  Clock,
  User as UserIcon, // Alias User to UserIcon to avoid conflict with User entity
  Tags,
  Library,
  Flame,
  ArrowLeft,
  Edit // Added Edit icon
} from 'lucide-react';

export default function KnowledgeBase() {
  const [user, setUser] = useState(null); // Added user state
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentUser, articlesData, videosData, faqsData] = await Promise.all([
        User.me().catch(() => null), // Fetch user, return null on error (e.g., not logged in)
        KnowledgeArticle.filter({ is_published: true }, '-created_date'),
        KnowledgeVideo.filter({ is_published: true }, '-created_date'),
        KnowledgeFAQ.filter({ is_published: true }, 'order')
      ]);
      setUser(currentUser); // Set user state
      setArticles(articlesData);
      setVideos(videosData);
      setFaqs(faqsData);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    }
    setLoading(false);
  };

  const articleCategories = [...new Set(articles.map(a => a.category))];
  const videoCategories = [...new Set(videos.map(v => v.category))];
  const faqCategories = [...new Set(faqs.map(f => f.category))];

  const filteredArticles = articles.filter(a =>
    (a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCategory || a.category === selectedCategory)
  );

  const filteredVideos = videos.filter(v =>
    (v.title.toLowerCase().includes(searchTerm.toLowerCase()) || v.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCategory || v.category === selectedCategory)
  );

  const filteredFaqs = faqs.filter(f =>
    (f.question.toLowerCase().includes(searchTerm.toLowerCase()) || f.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCategory || f.category === selectedCategory)
  );

  // Determine if the current user has management permissions
  const canManage = user?.role === 'admin' || user?.title === 'Admin' || user?.title === 'Project Manager';

  const renderCategoryView = () => {
    let categories;
    switch (activeTab) {
      case 'articles':
        categories = articleCategories;
        break;
      case 'videos':
        categories = videoCategories;
        break;
      case 'faqs':
        categories = faqCategories;
        break;
      default:
        categories = [];
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <Card key={category} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedCategory(category)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="w-5 h-5 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Browse all content in the {category} category.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'articles':
        return filteredArticles.map(article => (
          <Card key={article.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Badge variant="secondary" className="mb-2">{article.category}</Badge>
              <h3 className="text-xl font-bold mb-2">{article.title}</h3>
              <div className="flex items-center text-sm text-muted-foreground gap-4 mb-4">
                <div className="flex items-center gap-1"><UserIcon className="w-4 h-4" /> {article.author_name || 'Admin'}</div> {/* Used UserIcon */}
                <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.read_time} min read</div>
              </div>
              <Link to={createPageUrl('ViewArticle', { id: article.id })}>
                <Button variant="outline" className="w-full">Read Article <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </CardContent>
          </Card>
        ));
      case 'videos':
        return filteredVideos.map(video => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <a href={video.video_url} target="_blank" rel="noopener noreferrer">
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-48 object-cover" />
            </a>
            <CardContent className="p-6">
              <Badge variant="secondary" className="mb-2">{video.category}</Badge>
              <h3 className="text-xl font-bold mb-2">{video.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{video.description}</p>
              <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">Watch Video <PlayCircle className="w-4 h-4 ml-2" /></Button>
              </a>
            </CardContent>
          </Card>
        ));
      case 'faqs':
        return (
          <Card>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map(faq => (
                  <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center relative"> {/* Added 'relative' class */}
          {canManage && ( // Conditionally render manage content button
            <Link to={createPageUrl('AdminKnowledgeBase')} className="absolute top-6 right-6">
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Manage Content
              </Button>
            </Link>
          )}
          <h1 className="text-5xl font-extrabold tracking-tight">Knowledge Base</h1>
          <p className="mt-4 text-lg text-muted-foreground">Your central hub for information, tutorials, and support.</p>
          <div className="mt-8 max-w-xl mx-auto relative">
            <Input
              type="text"
              placeholder="Search for articles, videos, or FAQs..."
              className="h-12 pl-12 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-center mb-8">
          <div className="bg-card p-1.5 rounded-xl border border-border flex items-center gap-2">
            <Button variant={activeTab === 'articles' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('articles'); setSelectedCategory(null); }} className="gap-2"><BookOpen className="w-4 h-4"/> Articles</Button>
            <Button variant={activeTab === 'videos' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('videos'); setSelectedCategory(null); }} className="gap-2"><PlayCircle className="w-4 h-4"/> Videos</Button>
            <Button variant={activeTab === 'faqs' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('faqs'); setSelectedCategory(null); }} className="gap-2"><HelpCircle className="w-4 h-4"/> FAQs</Button>
          </div>
        </div>
        
        {selectedCategory && (
          <div className="mb-6 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedCategory(null)}><ArrowLeft className="w-4 h-4" /></Button>
            <h2 className="text-2xl font-bold">Category: {selectedCategory}</h2>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading content...</div>
        ) : selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderContent()}
          </div>
        ) : (
          renderCategoryView()
        )}
      </div>
    </div>
  );
}
