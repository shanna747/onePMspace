
import React, { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { ProjectFile } from "@/api/entities";
import { User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // CardFooter and Card removed as they are no longer used in the JSX structure
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast"; // Added toast for notifications
import { Loader2, Info } from 'lucide-react'; // Added Loader2 and Info, removed Settings, Save, Upload, ImageIcon, FileText, Download, Trash2, Calendar, AlertCircle, UserPlus, Mail, X

export default function ProjectDetailsForm({ project, onUpdate }) {
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    accent_color: project.accent_color || '#8B5CF6', // Updated default accent color as per outline
    value: project.value || '',
    client_name: project.client_name || '', // Added client_name as per outline
  });
  const [logo, setLogo] = useState(null); // Renamed newLogo to logo
  const [logoPreview, setLogoPreview] = useState(project.logo_url || '');
  const [loading, setLoading] = useState(false);

  // Removed useEffect for loading documents and additional clients, as these features are removed
  // Removed projectDocuments, uploadingDocument, additionalClientEmail, additionalClients, loadingClients, invitingClients states as these features are removed.
  // Removed hasChanges state as it's no longer used.

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file); // Updated to use logo state
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Removed handleDocumentUpload, handleDeleteDocument as document management is removed
  // Removed handleAddAdditionalClient, handleRemoveAdditionalClient as client management is removed

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let updatedData = {};

      for (const key in formData) {
        if (key === 'value') {
          const currentFormValue = parseFloat(formData[key]);
          const originalProjectValue = parseFloat(project[key]);

          if (isNaN(currentFormValue) && isNaN(originalProjectValue)) {
            // Both are NaN (e.g., empty string, null, undefined), consider them unchanged
          } else if (currentFormValue !== originalProjectValue) {
            updatedData[key] = currentFormValue || 0;
          }
        } else {
          if (String(formData[key]) !== String(project[key])) {
            updatedData[key] = formData[key];
          }
        }
      }

      if (logo) { // Updated to use logo state
        try {
          const result = await UploadFile({ file: logo });
          updatedData.logo_url = result.file_url;
        } catch (logoError) {
          console.error("Error uploading logo:", logoError);
          toast({
            title: "Error uploading logo",
            description: `Please try again. ${logoError.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      if (Object.keys(updatedData).length === 0 && !logo) { // Updated to use logo state
        toast({
          title: "No changes detected",
          description: "There are no modifications to save.",
          variant: "default",
        });
        setLoading(false);
        return;
      }

      let updatedProject;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          updatedProject = await Project.update(project.id, updatedData);
          break;
        } catch (updateError) {
          retryCount++;
          console.error(`Update attempt ${retryCount} failed:`, updateError);

          if (retryCount >= maxRetries) {
            throw updateError;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }
      }

      onUpdate(updatedProject);
      setLogo(null); // Updated to use logo state

      toast({
        title: "Project updated successfully!",
        variant: "success", // Assuming a 'success' variant exists for toast
      });

    } catch (error) {
      console.error("Error updating project:", error);

      let errorMessage = "Error updating project. ";
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        errorMessage += "Network connection issue. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage += "Request timed out. This can happen with very large descriptions. Please try saving a shorter description or in parts.";
      } else if (error.message.includes('413') || error.message.includes('payload') || error.message.includes('entity too large')) {
        errorMessage += "The data is too large. This can happen with very long descriptions or large logos. Please try shortening the description or uploading a smaller logo.";
      } else {
        errorMessage += error.message || "Please try again.";
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Removed formatFileSize as document management is removed

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Project Details</CardTitle>
        <CardDescription>Update the name, dates, and branding for this project.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6"> {/* Simplified spacing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="client_name">Client Company Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the project scope..."
              rows={4} /> {/* Changed rows and removed maxLength */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <Label htmlFor="value">Project Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)} />
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={formData.accent_color || '#8B5CF6'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.accent_color || '#8B5CF6'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="flex-1" />
                </div>
              </div>
          </div>

          <div>
            <Label htmlFor="logo">Client Logo</Label>
            <div className="flex items-center gap-4 mt-2">
               {logoPreview &&
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="w-16 h-16 rounded-lg object-cover bg-muted"
                />
              }
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="flex-1" />
            </div>
          </div>

        </CardContent>
        <div className="px-6 py-4 border-t border-border flex justify-end"> {/* Replaced CardFooter with a div */}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </>
  );
}
