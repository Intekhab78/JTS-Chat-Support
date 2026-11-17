import { ArrowUpRight } from "lucide-react";

export default function StatCard({ label, value, trend, color = "indigo", onClick }) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/20 text-indigo-500",
    orange: "from-orange-500 to-amber-500 shadow-orange-500/20 text-orange-500",
    rose: "from-rose-500 to-pink-500 shadow-rose-500/20 text-rose-500",
    emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/20 text-emerald-500"
  };

  const selectedColor = colors[color] || colors.indigo;

  return (
    <article
      onClick={onClick}
      className={`premium-card p-3.5 lg:p-4 group hover:-translate-y-0.5 transition-all duration-300 bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between ${
        onClick ? "cursor-pointer active:scale-95" : ""
      }`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
           <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors leading-tight">{label}</span>
           {trend && (
             <div className="px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-tight flex items-center gap-1 group-hover:bg-white dark:group-hover:bg-white/10 transition-colors shrink-0 whitespace-nowrap">
               <ArrowUpRight size={10} className={selectedColor.split(' ').pop()} />
               <span className="text-slate-400 dark:text-slate-500">{trend}</span>
             </div>
           )}
        </div>
        <div className="flex items-baseline gap-2">
           <strong className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</strong>
        </div>
      </div>
      <div className={`h-1 w-10 bg-slate-100 dark:bg-white/5 rounded-full mt-3 group-hover:w-16 bg-gradient-to-r ${selectedColor.split(' ').slice(0, 2).join(' ')} transition-all duration-500 shadow-sm`}></div>
    </article>
  );
}
