import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import HealthScoreIndicator from './HealthScoreIndicator';

export default function HealthMetricCard({ title, description, score, value, children }) {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <HealthScoreIndicator score={score} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white mb-4">{value}</div>
        <div className="text-sm text-white/80 space-y-2">{children}</div>
      </CardContent>
    </Card>
  );
}