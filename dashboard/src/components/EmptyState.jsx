import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = "No Records Found", 
  message = "You don't have any records yet. Create your first item to get started.", 
  action 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-panel rounded-3xl border border-slate-200 dark:border-white/10 mt-4 animate-fade-in w-full">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Icon size={32} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{message}</p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}
