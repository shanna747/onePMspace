import React, { useState, useEffect, useCallback } from "react";
import { ProjectFile } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Download, Trash2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function ProjectFiles({ project, user }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const filesList = await ProjectFile.filter({ project_id: project.id }, '-created_date');
      setFiles(filesList);
    } catch (error) {
      console.error("Error loading files:", error);
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    if (project?.id) {
      loadFiles();
    }
  }, [project?.id, loadFiles]);

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const result = await UploadFile({ file });
        return ProjectFile.create({
          project_id: project.id,
          file_name: file.name,
          file_url: result.file_url,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id
        });
      });

      await Promise.all(uploadPromises);
      loadFiles();
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await ProjectFile.delete(fileId);
      loadFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canEdit = user && (user.role === 'admin' || user.title === 'Project Manager');

  return (
    <div className="p-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Files</h2>
          <p className="text-muted-foreground">Shared documents and assets</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button as="span" disabled={uploading} className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No files yet</h3>
              <p className="text-muted-foreground">Files uploaded to this project will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.file_name}</TableCell>
                    <TableCell>{format(new Date(file.created_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatFileSize(file.file_size)}</TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <a href={file.file_url} download target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="bg-slate-50">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                      {canEdit && (
                        <Button variant="outline" size="icon" onClick={() => handleDelete(file.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}