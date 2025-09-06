
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { KnowledgeArticle } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Clock, User, Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ViewArticle() {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const articleId = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      try {
        const articles = await KnowledgeArticle.filter({ id: articleId });
        if (articles.length > 0) {
          setArticle(articles[0]);
        } else {
          setArticle(null); // Explicitly set to null if not found
        }
      } catch (error) {
        console.error("Error loading article:", error);
        setArticle(null); // Set to null on error as well
      }
      setLoading(false);
    };

    if (articleId) {
      loadArticle();
    } else {
      setLoading(false);
      setArticle(null); // No article ID means no article to display
    }
  }, [articleId]); // articleId is the only dependency

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-6">The article you are looking for does not exist or has been removed.</p>
        <Link to={createPageUrl('KnowledgeBase')}>
          <Button>Back to Knowledge Base</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link to={createPageUrl('KnowledgeBase')}>
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Knowledge Base
            </Button>
          </Link>
        </div>

        <article>
          <header className="mb-8">
            <Badge variant="secondary" className="mb-4">{article.category}</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">{article.title}</h1>
            <div className="mt-6 flex items-center space-x-6 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author_name || 'Admin'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.read_time} min read</span>
              </div>
            </div>
          </header>

          <div 
            className="prose prose-lg dark:prose-invert max-w-none prose-p:text-foreground/80 prose-headings:text-foreground prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.tags && article.tags.length > 0 && (
            <footer className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-muted-foreground" />
                {article.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </footer>
          )}
        </article>
      </div>
    </div>
  );
}
