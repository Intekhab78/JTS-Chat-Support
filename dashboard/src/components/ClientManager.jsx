import { useState, useEffect } from "react";
import { UserPlus, Mail, Shield, Activity, Search, Trash2, Building2, Globe, Users, X, ChevronLeft, MessageSquare, MonitorSmartphone } from "lucide-react";
import { api } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";

function ClientDetailView({ client, details, onBack }) {
   if (!details) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
         <div className="w-12 h-12 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin" />
         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Loading Ecosystem Data...</p>
      </div>
   );

   const websitePagination = getPaginationMeta(details.websites || [], 1);
   const personnelPagination = getPaginationMeta(details.personnel || [], 1);
   const chatsPagination = getPaginationMeta(details.chats || [], 1);

   return (
      <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
               <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm">
                  <ChevronLeft size={20} />
               </button>
               <div>
                  <h3 className="heading-md dark:text-white flex items-center gap-3">
                     {client.name}
                     <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">Client</span>
                  </h3>
                  <p className="small-label dark:text-slate-500 flex items-center gap-2 mt-1">
                     <Mail size={12} className="text-indigo-400" /> {client.email}
                  </p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4">
               <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4"><Globe size={20} /></div>
               <h4 className="text-2xl font-black text-slate-900 dark:text-white">{details.websites.length}</h4>
               <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Active Domains</p>
            </div>
            <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4">
               <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4"><Users size={20} /></div>
               <h4 className="text-2xl font-black text-slate-900 dark:text-white">{details.personnel.length}</h4>
               <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Total Personnel</p>
            </div>
            <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4"><MessageSquare size={20} /></div>
               <h4 className="text-2xl font-black text-slate-900 dark:text-white">{details.chats.length}</h4>
               <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Recent Chats</p>
            </div>
            <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4">
               <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4"><MonitorSmartphone size={20} /></div>
               <h4 className="text-2xl font-black text-slate-900 dark:text-white">{details.visitors.length}</h4>
               <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Unique Visitors</p>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* DOMAINS */}
            <div className="space-y-6">
               <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <Globe className="text-indigo-500" size={16} /> Managed Domains
               </h4>
               <div className="space-y-4">
                  {websitePagination.pageItems.map(w => (
                     <div key={w._id} className="premium-card p-6 border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex justify-between items-center group">
                        <div>
                           <strong className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight block">{w.websiteName}</strong>
                           <span className="text-[10px] text-slate-400 font-bold tracking-widest">{w.domain}</span>
                        </div>
                        <span className={`px-3 py-1 text-[9px] font-black tracking-widest uppercase rounded-lg ${w.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                           {w.isActive ? 'Online' : 'Offline'}
                        </span>
                     </div>
                  ))}
                  {details.websites.length === 0 && <p className="text-xs font-bold text-slate-400 p-6 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl text-center">No domains mapped.</p>}
               </div>
            </div>

            {/* PERSONNEL */}
            <div className="space-y-6">
               <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <Shield className="text-indigo-500" size={16} /> Deployed Personnel
               </h4>
               <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {personnelPagination.pageItems.map(p => (
                     <div key={p._id} className="premium-card p-6 border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 flex items-center justify-center font-black">
                           {p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <strong className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight block truncate">{p.name}</strong>
                           <span className="text-[10px] text-slate-400 font-bold tracking-widest flex items-center gap-1"><Mail size={10} /> {p.email}</span>
                        </div>
                        <span className="px-3 py-1 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                           {p.role}
                        </span>
                     </div>
                  ))}
                  {details.personnel.length === 0 && <p className="text-xs font-bold text-slate-400 p-6 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl text-center">No personnel deployed.</p>}
               </div>
            </div>
         </div>

         {/* RECENT CHATS */}
         <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
               <Activity className="text-indigo-500" size={16} /> Recent Conversations & Traffic
            </h4>
            <div className="premium-card p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/5">
                           <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Status</th>
                           <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Domain</th>
                           <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Visitor</th>
                           <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Assigned</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {chatsPagination.pageItems.map(chat => (
                           <tr key={chat._id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4">
                                 <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${chat.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                                    {chat.status}
                                 </span>
                              </td>
                              <td className="px-8 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">{chat.websiteId?.websiteName || 'Unknown'}</td>
                              <td className="px-8 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{chat.visitorId?.name || chat.visitorId?.visitorId || 'Guest'}</td>
                              <td className="px-8 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-300">{chat.assignedAgent?.name || '-'}</td>
                           </tr>
                        ))}
                        {details.chats.length === 0 && (
                           <tr><td colSpan="4" className="text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">No chat history found.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
   );
}

export default function ClientManager() {
   const toast = useToast();
   const [clients, setClients] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [isAdding, setIsAdding] = useState(false);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedClient, setSelectedClient] = useState(null);
   const [clientDetails, setClientDetails] = useState(null);
   const [page, setPage] = useState(1);
   const [formData, setFormData] = useState({
      name: "",
      email: "",
      password: "",
      plan: "pro"
   });

   const fetchClients = async () => {
      try {
         const data = await api("/api/users/clients");
         setClients(data);
      } catch (err) {
         setError(err.message);
         toast.error("Failed to load clients: " + err.message);
      } finally {
         setLoading(false);
      }
   };

   const loadClientDetails = async (client) => {
      try {
         setSelectedClient(client);
         setClientDetails(null);
         const data = await api(`/api/users/clients/${client._id}/details`);
         setClientDetails(data);
         window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
         setError(err.message);
         toast.error("Failed to load client details: " + err.message);
         setSelectedClient(null);
      }
   };

   useEffect(() => {
      fetchClients();
   }, []);

   useEffect(() => {
      setPage(1);
   }, [searchTerm, clients.length]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      try {
         await api("/api/users/clients", {
            method: "POST",
            body: JSON.stringify(formData)
         });
         setIsAdding(false);
         setFormData({ name: "", email: "", password: "", plan: "pro" });
         fetchClients();
      } catch (err) {
         setError(err.message);
         toast.error("Failed to create client: " + err.message);
      }
   };

   const filteredClients = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
   );
   const paginatedClients = getPaginationMeta(filteredClients, page);

   if (selectedClient) {
      return <ClientDetailView client={selectedClient} details={clientDetails} onBack={() => {
         setSelectedClient(null);
         setClientDetails(null);
         fetchClients();
      }} />;
   }

   if (loading) return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
         <div className="w-12 h-12 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin" />
         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Client Network...</p>
      </div>
   );

   return (
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-1.5">
               <h3 className="heading-md dark:text-white">Client Infrastructure</h3>
               <p className="small-label dark:text-slate-500">Manage high-level enterprise accounts and their respective support ecosystems.</p>
            </div>
            <div className="flex gap-4">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                  <input
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="Locate client entity..."
                     className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all w-64 shadow-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  />
               </div>
               <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100/10 flex items-center justify-center gap-3"
               >
                  {isAdding ? <X size={16} /> : <UserPlus size={16} />}
                  {isAdding ? "Cancel" : "Add Client"}
               </button>
            </div>
         </div>

         {isAdding && (
            <form onSubmit={handleSubmit} className="premium-card p-10 md:p-14 animate-in zoom-in-95 duration-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                  <div className="space-y-3">
                     <label className="small-label dark:text-slate-400">Entity Identity Name</label>
                     <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800"
                        placeholder="Acme Corporation"
                        required
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="small-label dark:text-slate-400">Master Contact Email</label>
                     <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800"
                        placeholder="admin@acme.com"
                        required
                     />
                  </div>
                  <div className="space-y-3 flex flex-col justify-end">
                     <label className="small-label dark:text-slate-400">Secure Access Key</label>
                     <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 dark:placeholder:text-slate-800"
                        placeholder="••••••••••••"
                        required
                     />
                  </div>
                  <div className="space-y-3 flex flex-col justify-end">
                     <label className="small-label dark:text-slate-400">Client Package</label>
                     <select
                        value={formData.plan}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-white focus:border-indigo-500/50 outline-none transition-all"
                     >
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="pro">Pro</option>
                     </select>
                  </div>
               </div>
               <div className="mt-10 pt-10 border-t border-slate-50 dark:border-white/5 flex justify-end">
                  <button type="submit" className="w-full md:w-fit bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] px-12 py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                     Authorize Client Provisioning
                  </button>
               </div>
            </form>
         )}

         {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl text-[11px] font-bold shadow-sm">
               Signal Error: {error}
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {paginatedClients.pageItems.map((client) => (
               <div key={client._id} onClick={() => loadClientDetails(client)} className="premium-card cursor-pointer group hover:shadow-2xl hover:shadow-indigo-500/5 transition-all bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-0 overflow-hidden">
                  <div className="p-8 flex items-center gap-8 relative">
                     <div className={`w-20 h-20 rounded-[32px] bg-slate-950 dark:bg-black flex items-center justify-center text-white text-2xl font-black shadow-2xl group-hover:bg-indigo-600 transition-all shrink-0 border border-white/5 group-hover:scale-105 duration-500`}>
                        <Building2 size={32} />
                     </div>

                     <div className="flex-1 min-w-0 space-y-4">
                        <div className="space-y-1">
                           <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{client.name}</h4>
                           <div className="flex items-center gap-2.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">
                              <Mail size={12} className="text-indigo-400/50" />
                              {client.email}
                           </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                              <Shield size={10} className="text-indigo-500" />
                              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{client.role}</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                              <Globe size={10} className="text-emerald-500" />
                              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{client.websiteCount || 0} Domains</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                              <Users size={10} className="text-amber-500" />
                              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{client.agentCount || 0} Personnel</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl shadow-sm">
                              <Shield size={10} className="text-rose-500" />
                              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{client.subscription?.plan || "pro"} plan</span>
                           </div>
                        </div>
                     </div>

                     <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button
                           type="button"
                           disabled
                           title="Client deletion is not available from this screen yet."
                           onClick={(e) => e.stopPropagation()}
                           className="p-3.5 text-slate-300 bg-slate-50 dark:bg-white/5 rounded-2xl transition-all shadow-sm cursor-not-allowed opacity-60"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>

                  {/* Bottom bar for premium feel */}
                  <div className="bg-slate-50/50 dark:bg-black/10 px-8 py-3 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity border-t border-slate-50 dark:border-white/5">
                     <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">View Ecosystem Log</span>
                     <ChevronLeft size={10} className="text-indigo-500 rotate-180 transition-transform group-hover:translate-x-1" />
                  </div>
               </div>
            ))}

            {filteredClients.length === 0 && !isAdding && (
               <div className="col-span-full py-32 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[48px] text-center space-y-6 bg-slate-50/30 dark:bg-white/5">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700 transition-transform hover:rotate-12">
                     <Building2 size={32} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">No Entities Found</h3>
                     <p className="small-label dark:text-slate-700">Initialize a client record to begin ecosystem deployment.</p>
                  </div>
               </div>
            )}
         </div>
         <PaginationControls
            currentPage={paginatedClients.currentPage}
            totalPages={paginatedClients.totalPages}
            totalItems={paginatedClients.totalItems}
            itemLabel="clients"
            onPageChange={setPage}
         />
      </div>
   );
}
