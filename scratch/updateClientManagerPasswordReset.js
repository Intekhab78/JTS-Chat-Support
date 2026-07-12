const fs = require('fs');

const targetFile = 'dashboard/src/components/ClientManager.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add lock/key icon import from lucide-react
content = content.replace(
  `import { UserPlus, Mail, Shield, Activity, Search, Trash2, Building2, Globe, Users, X, ChevronLeft, MessageSquare, MonitorSmartphone } from "lucide-react";`,
  `import { UserPlus, Mail, Shield, Activity, Search, Trash2, Building2, Globe, Users, X, ChevronLeft, MessageSquare, MonitorSmartphone, Key } from "lucide-react";`
);

// 2. Pass password reset handlers to ClientDetailView
content = content.replace(
  `function ClientDetailView({ client, details, onBack }) {`,
  `function ClientDetailView({ client, details, onBack, onResetPassword }) {`
);

// 3. Add Lock button next to Personnel deployed items inside ClientDetailView
const personnelTarget = `<span className="px-3 py-1 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                           {p.role}
                        </span>`;

const personnelReplacement = `<span className="px-3 py-1 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                           {p.role}
                        </span>
                        <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); onResetPassword(p); }}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-xl transition-all"
                           title="Reset User Password"
                        >
                           <Key size={14} />
                        </button>`;

content = content.replace(personnelTarget, personnelReplacement);

// 4. Update ClientDetailView invocation inside ClientManager
const detailViewInvocationTarget = `    if (selectedClient) {
       return <ClientDetailView client={selectedClient} details={clientDetails} onBack={() => {
          setSelectedClient(null);
          setClientDetails(null);
          fetchClients();
       }} />;
    }`;

const detailViewInvocationReplacement = `    if (selectedClient) {
       return <ClientDetailView 
          client={selectedClient} 
          details={clientDetails} 
          onBack={() => {
             setSelectedClient(null);
             setClientDetails(null);
             fetchClients();
          }} 
          onResetPassword={(user) => {
             setResettingUser(user);
             setCustomPassword("");
          }}
       />;
    }`;

content = content.replace(detailViewInvocationTarget, detailViewInvocationReplacement);

// 5. Add Key icon to main Client cards for resetting client passwords directly
const clientCardTarget = `<div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">`;
const clientCardReplacement = `<div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex gap-2">
                        <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); setResettingUser(client); setCustomPassword(""); }}
                           className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-2xl transition-all shadow-sm"
                           title="Reset Client Password"
                        >
                           <Key size={16} />
                        </button>`;

content = content.replace(clientCardTarget, clientCardReplacement);

// 6. Define States and resetPassword functions inside ClientManager component
const stateTarget = `   const toast = useToast();
   const [clients, setClients] = useState([]);
   const [loading, setLoading] = useState(true);`;

const stateReplacement = `   const toast = useToast();
   const [clients, setClients] = useState([]);
   const [loading, setLoading] = useState(true);
   
   // Password reset states
   const [resettingUser, setResettingUser] = useState(null);
   const [customPassword, setCustomPassword] = useState("");
   const [tempPassword, setTempPassword] = useState("");
   const [resetSuccess, setResetSuccess] = useState(false);
   const [resetLoading, setResetLoading] = useState(false);

   const handleAdminResetPassword = async (e) => {
      e.preventDefault();
      if (!resettingUser) return;
      setResetLoading(true);
      try {
         const data = await api(\`/api/users/\${resettingUser._id}/reset-password\`, {
            method: "POST",
            body: JSON.stringify({ newPassword: customPassword })
         });
         setTempPassword(data.password);
         setResetSuccess(true);
         toast.success("Password reset email sent successfully!");
         
         // Refresh detail view if we are viewing it
         if (selectedClient) {
            loadClientDetails(selectedClient);
         }
      } catch (err) {
         toast.error("Failed to reset password: " + err.message);
      } finally {
         setResetLoading(false);
      }
   };`;

content = content.replace(stateTarget, stateReplacement);

// 7. Inject Password Reset Modal at the bottom of the ClientManager component
const renderReturnTarget = `         <PaginationControls
            currentPage={paginatedClients.currentPage}
            totalPages={paginatedClients.totalPages}
            totalItems={paginatedClients.totalItems}
            itemLabel="clients"
            onPageChange={setPage}
         />
      </div>
   );
}`;

const renderReturnReplacement = `         <PaginationControls
            currentPage={paginatedClients.currentPage}
            totalPages={paginatedClients.totalPages}
            totalItems={paginatedClients.totalItems}
            itemLabel="clients"
            onPageChange={setPage}
         />

         {/* Password Reset Dialog Modal */}
         {resettingUser && (
            <>
               <div 
                  className="fixed inset-0 z-[9900] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
               />
               <div className="fixed inset-0 z-[9901] flex items-center justify-center p-4 pointer-events-none">
                  <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-300 overflow-hidden">
                     <div className="flex items-start justify-between p-6 pb-0">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                           <Key size={20} />
                        </div>
                        <button
                           onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                           className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                           <X size={16} />
                        </button>
                     </div>

                     {!resetSuccess ? (
                        <form onSubmit={handleAdminResetPassword}>
                           <div className="px-6 pt-4 pb-6 space-y-4">
                              <div>
                                 <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Reset Password</h3>
                                 <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">Target Account: <span className="text-indigo-500 font-black">{resettingUser.name} ({resettingUser.email})</span></p>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Custom Password (Optional)</label>
                                 <input
                                    type="text"
                                    value={customPassword}
                                    onChange={(e) => setCustomPassword(e.target.value)}
                                    placeholder="Leave blank to auto-generate secure password"
                                    className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-white focus:border-indigo-500/50 outline-none transition-all"
                                 />
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                                 ⚠️ Administrative passwords updates are saved and dispatched automatically to the user's registered email address.
                              </p>
                           </div>
                           <div className="flex gap-3 px-6 pb-6">
                              <button
                                 type="button"
                                 onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                                 className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5"
                              >
                                 Cancel
                              </button>
                              <button
                                 type="submit"
                                 disabled={resetLoading}
                                 className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/10"
                              >
                                 {resetLoading ? "Updating..." : "Reset & Mail"}
                              </button>
                           </div>
                        </form>
                     ) : (
                        <div className="px-6 pt-4 pb-6 space-y-6">
                           <div>
                              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Password Reset Successfully</h3>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">Credentials have been sent to their inbox.</p>
                           </div>
                           <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-center space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Plaintext Password View</span>
                              <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider select-all block">{tempPassword}</span>
                           </div>
                           <button
                              type="button"
                              onClick={() => { setResettingUser(null); setResetSuccess(false); setTempPassword(""); }}
                              className="w-full py-4 bg-slate-950 dark:bg-indigo-600 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]"
                           >
                              Close Panel
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </>
         )}
      </div>
   );
}`;

content = content.replace(renderReturnTarget, renderReturnReplacement);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ ClientManager.jsx updated with Admin Password Reset modal');
