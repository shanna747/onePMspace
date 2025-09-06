
import React, { useState, useEffect, useCallback } from 'react';
import { TestingCard } from '@/api/entities';
import { Project } from '@/api/entities';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CreateTestCard() {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [referenceImages, setReferenceImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const projectId = urlParams.get('project_id');

  const loadUserAndProject = useCallback(async () => {
    try {
      const currentUser = await User.me();
      
      // Allow both admins and project managers to create test cards
      if (currentUser.role !== 'admin' && currentUser.title !== 'Project Manager') {
        window.location.href = createPageUrl('Dashboard');
        return;
      }

      setUser(currentUser);

      if (projectId) {
        const projects = await Project.filter({ id: projectId });
        if (projects.length > 0) {
          setProject(projects[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      window.location.href = createPageUrl('Dashboard');
    }
  }, [projectId]); // projectId is a dependency for this useCallback

  useEffect(() => {
    loadUserAndProject();
  }, [loadUserAndProject]); // loadUserAndProject is now a stable function reference due to useCallback

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReferenceImages(prev => [...prev, {
          file,
          preview: e.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project) return;

    setLoading(true);
    setUploading(true);

    try {
      let uploadedImageUrls = [];

      // Upload reference images
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(file => UploadFile({ file }));
        const uploadResults = await Promise.all(uploadPromises);
        uploadedImageUrls = uploadResults.map(result => result.file_url);
      }

      // Get the current max order for proper ordering
      const existingCards = await TestingCard.filter({ project_id: project.id });
      const maxOrder = existingCards.reduce((max, card) => Math.max(max, card.order || 0), -1);

      // Create the test card
      await TestingCard.create({
        project_id: project.id,
        title: formData.title,
        description: formData.description,
        reference_image_urls: uploadedImageUrls,
        order: maxOrder + 1
      });

      // Redirect back to project testing or settings
      window.location.href = createPageUrl(`ProjectSettings?id=${project.id}&tab=testing`);

    } catch (error) {
      console.error('Error creating test card:', error);
      alert('Failed to create test card. Please try again.');
    }

    setLoading(false);
    setUploading(false);
  };

  if (!user || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl(`ProjectSettings?id=${project.id}&tab=testing`)}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Add Test Card</h1>
            <p className="text-muted-foreground">Create a new testing item for {project.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Card Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Test Card Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Homepage Design Review"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description & Instructions</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what needs to be tested or reviewed..."
                  rows={4}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Reference Images (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload reference images that show what the client should compare against.
                </p>
                
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose Images</span>
                      </Button>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {referenceImages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-3">Reference Images:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {referenceImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-32 object-cover rounded-lg border border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Link to={createPageUrl(`ProjectSettings?id=${project.id}&tab=testing`)}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </div>
                  ) : loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Create Test Card
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
