import React, { useState, useEffect } from 'react';
import { TimelineItem } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, isAfter, formatDistanceToNow } from 'date-fns';
import HealthMetricCard from './health/HealthMetricCard';
import { User, Calendar, AlertTriangle } from 'lucide-react';
import HealthScoreIndicator from './health/HealthScoreIndicator';
import AITopicsGraph from './health/AITopicsGraph';

export default function ClientHealthDashboard({ project, user }) {
  const [metrics, setMetrics] = useState({
    completion: 0,
    timeElapsed: 0,
    overdueTasks: 0,
    healthScore: 'healthy'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateHealth = async () => {
      if (!project || !project.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const timelineItems = await TimelineItem.filter({ project_id: project.id });

        // Timeline Progress
        const totalTasks = timelineItems.length;
        const completedTasks = timelineItems.filter((item) => item.is_completed).length;
        const completion = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 100;

        // Time Elapsed
        let timeElapsed = 0;
        if (project.start_date && project.end_date) {
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);
          const totalDuration = differenceInDays(endDate, startDate);
          if (totalDuration > 0) {
            const elapsedDuration = differenceInDays(new Date(), startDate);
            timeElapsed = Math.round(Math.max(0, Math.min(100, elapsedDuration / totalDuration * 100)));
          }
        }

        // Overdue Tasks
        const overdueTasks = timelineItems.filter((item) =>
        !item.is_completed && item.due_date && isAfter(new Date(), new Date(item.due_date))
        ).length;

        // Health Score Logic
        let healthScore = 'healthy';
        const progressLag = timeElapsed - completion;

        if (overdueTasks > 5 || progressLag > 25) {
          healthScore = 'critical';
        } else if (overdueTasks > 0 || progressLag > 10) {
          healthScore = 'at_risk';
        }

        setMetrics({
          completion,
          timeElapsed,
          overdueTasks,
          healthScore
        });

      } catch (error) {
        console.error("Error calculating project health:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateHealth();
  }, [project]);

  const lastLogin = user?.last_login_date ? formatDistanceToNow(new Date(user.last_login_date), { addSuffix: true }) : 'No login data';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);

  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Project Health Summary</CardTitle>
              <CardDescription>An overview of key project performance indicators.</CardDescription>
            </div>
            <HealthScoreIndicator score={metrics.healthScore} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HealthMetricCard title="Timeline Progress">
              <div className="text-2xl font-bold text-slate-950">{metrics.completion}%</div>
              <Progress value={metrics.completion} className="w-full mt-2 h-2" />
            </HealthMetricCard>
            <HealthMetricCard title="Time Elapsed">
              <div className="text-2xl text-slate-950 font-bold">{metrics.timeElapsed}%</div>
              <Progress value={metrics.timeElapsed} className="w-full mt-2 h-2" />
            </HealthMetricCard>
            <HealthMetricCard title="Overdue Tasks" icon={<AlertTriangle className="text-destructive" />}>
              <div className="text-2xl font-bold text-slate-950">{metrics.overdueTasks}</div>
            </HealthMetricCard>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />Client Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium text-foreground">{user.first_name} {user.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Login</span>
              <span className="font-medium text-foreground">{lastLogin}</span>
            </div>
          </CardContent>
        </Card>
        <AITopicsGraph project={project} />
      </div>
    </div>);

}