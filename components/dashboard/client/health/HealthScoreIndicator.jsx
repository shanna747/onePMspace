import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function HealthScoreIndicator({ score, size = 'md' }) {
  const config = {
    healthy: {
      label: 'Healthy',
      icon: <CheckCircle className={size === 'md' ? "w-4 h-4" : "w-5 h-5"} />,
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    at_risk: {
      label: 'At Risk',
      icon: <AlertTriangle className={size === 'md' ? "w-4 h-4" : "w-5 h-5"} />,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    critical: {
      label: 'Critical',
      icon: <XCircle className={size === 'md' ? "w-4 h-4" : "w-5 h-5"} />,
      className: 'bg-red-100 text-red-800 border-red-300'
    }
  };

  const current = config[score] || config.at_risk;

  return (
    <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center gap-2 ${current.className}`}>
      {current.icon}
      <span className="font-semibold">{current.label}</span>
    </Badge>
  );
}