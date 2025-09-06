import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck } from 'lucide-react';

export default function PermissionsManagement({ project }) {
  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="w-6 h-6" /> Permissions Management
        </CardTitle>
        <CardDescription>
          Control user roles and access permissions for this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-500">
            <p>This feature is currently under development.</p>
            <p className="text-sm">Granular permission controls will be available here soon.</p>
        </div>
      </CardContent>
    </>
  );
}