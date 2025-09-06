import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export default function BotConfigForm({ config, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    product_info: config?.product_info || '',
    knowledge_articles: config?.knowledge_articles || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addArticle = () => {
    setFormData({
      ...formData,
      knowledge_articles: [
      ...formData.knowledge_articles,
      { title: '', url: '', summary: '' }]

    });
  };

  const updateArticle = (index, field, value) => {
    const articles = [...formData.knowledge_articles];
    articles[index][field] = value;
    setFormData({ ...formData, knowledge_articles: articles });
  };

  const removeArticle = (index) => {
    setFormData({
      ...formData,
      knowledge_articles: formData.knowledge_articles.filter((_, i) => i !== index)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label>Product Information</Label>
        <Textarea
          value={formData.product_info}
          onChange={(e) => setFormData({ ...formData, product_info: e.target.value })}
          placeholder="Describe your product, its features, use cases, etc..."
          rows={4} />

      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Knowledge Articles</Label>
          <Button type="button" onClick={addArticle} size="sm" variant="outline" className="bg-slate-50 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-9 rounded-md">
            <Plus className="w-4 h-4 mr-2" />
            Add Article
          </Button>
        </div>
        
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
          {formData.knowledge_articles.length === 0 ?
          <div className="text-center text-slate-500 py-4">
                No articles added.
            </div> :

          formData.knowledge_articles.map((article, index) =>
          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="font-medium">Article {index + 1}</Label>
                    <Button
                type="button"
                onClick={() => removeArticle(index)}
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600">

                    <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                <Input
              placeholder="Article title"
              value={article.title}
              onChange={(e) => updateArticle(index, 'title', e.target.value)} />

                <Input
              placeholder="Article URL"
              value={article.url}
              onChange={(e) => updateArticle(index, 'url', e.target.value)} />

                <Textarea
              placeholder="Brief summary"
              value={article.summary}
              onChange={(e) => updateArticle(index, 'summary', e.target.value)}
              rows={2} />

                </div>
          )
          }
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={loading} className="bg-slate-50 text-primary-foreground px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-10">
          {loading ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>);

}