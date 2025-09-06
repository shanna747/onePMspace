
import React, { useState, useEffect } from 'react';
import { GlobalSettings } from '@/api/entities';
import { Project } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  MessageSquare, 
  FileText, 
  ListChecks, 
  TestTube, 
  Bot,
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function FeatureToggle({ project, onUpdate }) {
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingFeature, setSavingFeature] = useState(null);

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  const loadGlobalSettings = async () => {
    try {
      const settings = await GlobalSettings.list();
      if (settings.length > 0) {
        setGlobalSettings(settings[0]);
      } else {
        // Default settings if none exist
        setGlobalSettings({
          chat_enabled: true,
          files_enabled: true,
          timeline_enabled: true,
          response_bot_enabled: true,
          testing_enabled: true
        });
      }
    } catch (error) {
      console.error("Error loading global settings:", error);
      toast({
        title: "Error",
        description: "Failed to load global settings. Some features may not be configurable.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleFeatureToggle = async (feature, enabled) => {
    // Check if the feature is globally disabled
    const globalKey = `${feature}_enabled`;
    if (globalSettings && !globalSettings[globalKey]) {
      toast({
        title: "Action Not Allowed",
        description: "This feature has been globally disabled by an administrator and cannot be enabled.",
        variant: "destructive"
      });
      return;
    }

    setSavingFeature(feature);

    try {
      const updatedFeatures = {
        ...project.features_enabled,
        [feature]: enabled
      };
      
      const updatedProject = await Project.update(project.id, { features_enabled: updatedFeatures });
      
      // Update the parent component's state with the successfully saved project data
      // The parent component should expect the full project object now
      onUpdate(updatedProject);
      
      const featureLabel = featureList.find(f => f.id === feature)?.label || 'Feature';
      toast({
        title: "Setting Saved",
        description: `${featureLabel} has been ${enabled ? 'enabled' : 'disabled'} for this project.`,
        variant: "success"
      });

    } catch (error) {
      console.error("Error updating feature toggle:", error);
      toast({
        title: "Save Failed",
        description: "Could not update the feature setting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingFeature(null);
    }
  };

  const featureList = [
    { 
      id: 'timeline', 
      label: 'Project Timeline', 
      icon: ListChecks,
      description: 'Allow clients to view project milestones and progress tracking.'
    },
    { 
      id: 'chat', 
      label: 'Real-time Chat', 
      icon: MessageSquare,
      description: 'Enable direct messaging between team members and clients.'
    },
    { 
      id: 'files', 
      label: 'File Sharing', 
      icon: FileText,
      description: 'Allow file uploads, downloads, and document management.'
    },
    { 
      id: 'testing', 
      label: 'Testing & Approval', 
      icon: TestTube,
      description: 'Enable client testing workflows and sign-off processes.'
    },
    { 
      id: 'response_bot', 
      label: 'AI Support Assistant', 
      icon: Bot,
      description: 'Provide automated assistance and instant support responses.'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Loading Feature Settings...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Feature Access Control
        </CardTitle>
        <CardDescription>
          Control which features are available to clients and team members for this project. Changes are saved automatically.
          {globalSettings && featureList.some(feature => globalSettings[`${feature.id}_enabled`] === false) && (
            <div className="flex items-center gap-2 mt-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Some features are globally disabled by administrators.</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {featureList.map((feature) => {
            const isProjectEnabled = project.features_enabled?.[feature.id] || false;
            const globalKey = `${feature.id}_enabled`;
            const isGloballyEnabled = globalSettings?.[globalKey] !== false; // Check if explicitly false
            const isDisabled = !isGloballyEnabled;
            const isSaving = savingFeature === feature.id;

            return (
              <div 
                key={feature.id} 
                className={`p-4 rounded-lg border transition-colors ${
                  isDisabled 
                    ? 'bg-muted/50 border-muted' 
                    : 'bg-card border-border hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <feature.icon className={`w-6 h-6 mt-1 ${isDisabled ? 'text-muted-foreground' : 'text-primary'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Label 
                          htmlFor={feature.id} 
                          className={`text-base font-medium ${
                            isDisabled ? 'text-muted-foreground' : 'text-foreground'
                          } ${!isDisabled ? 'cursor-pointer' : ''}`}
                        >
                          {feature.label}
                        </Label>
                        {!isGloballyEnabled && (
                          <Badge variant="secondary" className="text-xs">
                            Globally Disabled
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${isDisabled ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {feature.description}
                      </p>
                      {!isGloballyEnabled && (
                        <p className="text-xs text-amber-600 mt-2">
                          This feature has been disabled by an administrator and cannot be enabled for individual projects.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    <Switch
                      id={feature.id}
                      checked={isGloballyEnabled ? isProjectEnabled : false}
                      onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)}
                      disabled={isDisabled || isSaving}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
