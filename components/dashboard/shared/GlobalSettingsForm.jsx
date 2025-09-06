
import React, { useState, useEffect } from 'react';
import { GlobalSettings } from '@/api/entities';
import { Project } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  FileText,
  ListChecks,
  TestTube,
  Bot,
  Kanban,
  BookOpen,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export default function GlobalSettingsForm({ settings, onSave, loading }) {
  const [currentSettings, setCurrentSettings] = useState({
    chat_enabled: true,
    files_enabled: true,
    timeline_enabled: true,
    response_bot_enabled: true,
    testing_enabled: true,
    obeya_enabled: true,
    wiki_enabled: true,
    ...settings
  });
  const [dialogContent, setDialogContent] = useState({
    open: false,
    title: '',
    description: null, // Changed to null to allow ReactNode
    onConfirm: null,
    confirmText: '',
    variant: 'default' // Added variant for button styling
  });
  const [pendingChange, setPendingChange] = useState(null); // Keep pendingChange to reset dialog states cleanly

  const handleToggle = async (feature, value) => {
    // If turning OFF a feature
    if (!value && currentSettings[feature]) {
      try {
        const allProjects = await Project.list();
        const featureKey = feature.replace('_enabled', '');
        const affectedProjects = allProjects.filter(project =>
          project.features_enabled && project.features_enabled[featureKey]
        );

        setPendingChange({ feature, value }); // Store pending change
        setDialogContent({
          open: true,
          title: (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Disable Feature Globally?
            </div>
          ),
          description: (
            <>
              <p>You are about to disable <strong>{getFeatureName(feature)}</strong> across the entire platform.</p>
              <p>This will affect <strong>{affectedProjects.length} live projects</strong> that currently have this feature enabled.</p>
              <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                <strong>Impact:</strong> This feature will be immediately hidden from all users and clients, and cannot be re-enabled at the project level until you turn it back on globally.
              </p>
            </>
          ),
          onConfirm: () => handleConfirmDisable(feature, affectedProjects),
          confirmText: 'Yes, Disable Feature',
          variant: 'destructive'
        });
      } catch (error) {
        console.error("Error counting affected projects:", error);
        // Fallback dialog if project counting fails
        setPendingChange({ feature, value });
        setDialogContent({
          open: true,
          title: (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Disable Feature Globally?
            </div>
          ),
          description: (
            <p>You are about to disable <strong>{getFeatureName(feature)}</strong> across the entire platform. Are you sure?</p>
          ),
          onConfirm: () => handleConfirmDisable(feature, []), // Pass empty array if counting failed
          confirmText: 'Yes, Disable Feature',
          variant: 'destructive'
        });
      }
    }
    // If turning ON a feature
    else if (value && !currentSettings[feature]) {
      try {
        const allProjects = await Project.list();

        setPendingChange({ feature, value }); // Store pending change
        setDialogContent({
          open: true,
          title: (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Enable Feature Globally?
            </div>
          ),
          description: (
            <>
              <p>You are about to re-enable <strong>{getFeatureName(feature)}</strong> across the entire platform.</p>
              <p>This will enable the feature for <strong>{allProjects.length} projects</strong>.</p>
              <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                <strong>Impact:</strong> This feature will be automatically enabled for all projects and will be visible to clients and team members immediately.
              </p>
            </>
          ),
          onConfirm: () => handleConfirmEnable(feature, allProjects),
          confirmText: 'Yes, Enable Feature',
          variant: 'default'
        });
      } catch (error) {
        console.error("Error counting projects:", error);
        // Proceed without project count if there's an error
        setDialogContent({
          open: true,
          title: 'Enable Feature Globally?',
          description: 'This will enable the feature for all projects.',
          onConfirm: () => handleConfirmEnable(feature, []),
          confirmText: 'Yes, Enable Feature',
          variant: 'default'
        });
      }
    } else {
      // For any other case (e.g., toggling to same state or unexpected scenarios), apply immediately
      setCurrentSettings((prev) => ({ ...prev, [feature]: value }));
    }
  };

  const handleConfirmEnable = async (feature, allProjects) => {
    const newSettings = { ...currentSettings, [feature]: true };
    setCurrentSettings(newSettings);
    closeDialog();
    
    await onSave(newSettings);
    
    try {
      const featureKey = feature.replace('_enabled', '');
      
      // Update ALL projects to enable this feature
      const updatePromises = allProjects.map(project => {
        const currentFeatures = project.features_enabled || {};
        const updatedFeatures = { 
          ...currentFeatures, 
          [featureKey]: true 
        };
        return Project.update(project.id, { features_enabled: updatedFeatures });
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`✅ Enabled ${featureKey} feature for ${updatePromises.length} projects`);
      }
    } catch (error) {
      console.error("❌ Error enabling feature for projects:", error);
      // Still proceed with the global setting change even if individual project updates fail
    }
  };

  const handleConfirmDisable = async (feature, affectedProjects) => {
    const newSettings = { ...currentSettings, [feature]: false };
    setCurrentSettings(newSettings);
    closeDialog();
    
    await onSave(newSettings);

    try {
      const featureKey = feature.replace('_enabled', '');
      
      // Update only projects that currently have this feature enabled
      const updatePromises = affectedProjects.map(project => {
        const currentFeatures = project.features_enabled || {};
        const updatedFeatures = { 
          ...currentFeatures, 
          [featureKey]: false 
        };
        return Project.update(project.id, { features_enabled: updatedFeatures });
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`✅ Disabled ${featureKey} feature for ${updatePromises.length} projects`);
      }
    } catch (error)
{
      console.error("❌ Error disabling feature for projects:", error);
    }
  };

  const closeDialog = () => {
    setDialogContent({ open: false, title: '', description: null, onConfirm: null, confirmText: '', variant: 'default' });
    setPendingChange(null);
  };

  const getFeatureName = (feature) => {
    const featureNames = {
      chat_enabled: 'Chat & Messaging',
      files_enabled: 'File Management',
      timeline_enabled: 'Timeline & Milestones',
      testing_enabled: 'Testing & Sign-off',
      response_bot_enabled: 'AI Support Bot',
      obeya_enabled: 'Obeya Boards',
      wiki_enabled: 'Knowledge Wiki'
    };
    return featureNames[feature] || feature;
  };

  const featureList = [
    { id: 'chat_enabled', label: 'Chat & Messaging', description: 'Enable real-time messaging between clients and teams', icon: MessageCircle },
    { id: 'files_enabled', label: 'File Management', description: 'Allow file uploads and downloads across projects', icon: FileText },
    { id: 'timeline_enabled', label: 'Timeline & Milestones', description: 'Enable project timeline and milestone tracking', icon: ListChecks },
    { id: 'testing_enabled', label: 'Testing & Sign-off', description: 'Allow clients to review and approve deliverables', icon: TestTube },
    { id: 'response_bot_enabled', label: 'AI Support Bot', description: 'Provide automated support and assistance', icon: Bot },
    { id: 'obeya_enabled', label: 'Obeya Boards', description: 'Enable visual collaboration boards for teams', icon: Kanban },
    { id: 'wiki_enabled', label: 'Knowledge Wiki', description: 'Enable collaborative documentation and knowledge base', icon: BookOpen }
  ];

  return (
    <>
      <style>
        {`
          .custom-switch[data-state="checked"] {
            background-color: #7c3aed !important;
          }
          .custom-switch[data-state="unchecked"] {
            background-color: #ddd6fe !important;
          }
          .custom-switch > span[data-state="checked"],
          .custom-switch > span[data-state="unchecked"] {
            background-color: white !important;
          }
        `}
      </style>

      <Card>
        <CardHeader>
          <CardTitle>Platform Features</CardTitle>
          <CardDescription>
            Control which features are available across the entire platform. Disabled features will be hidden from all users and projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {featureList.map((feature) =>
              <div key={feature.id} className="flex items-center justify-between p-4 rounded-lg hover:none">
                <div className="flex items-start gap-3">
                  <feature.icon className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <Label htmlFor={feature.id} className="text-base font-medium text-slate-900">{feature.label}</Label>
                    <p className="text-sm text-slate-500">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  id={feature.id}
                  checked={currentSettings[feature.id]}
                  onCheckedChange={(checked) => handleToggle(feature.id, checked)}
                  className="custom-switch"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unified Confirmation Dialog */}
      <Dialog open={dialogContent.open} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              {dialogContent.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant={dialogContent.variant} onClick={dialogContent.onConfirm}>
              {dialogContent.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
