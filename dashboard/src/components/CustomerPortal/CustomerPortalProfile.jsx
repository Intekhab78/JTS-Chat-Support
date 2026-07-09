import React, { useState, useEffect } from "react";
import { User, ShieldCheck, Key, Settings, Building2, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalProfile() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await api("/api/crm/customer-portal/profile");
      setProfile(res);
      setName(res?.customer?.name || "");
      setPhone(res?.customer?.phone || "");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    try {
      await api("/api/crm/customer-portal/profile", {
        method: "PUT",
        body: JSON.stringify({ name, phone })
      });
      toast.success("Profile contact information updated successfully");
      fetchProfile();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    try {
      await api("/api/crm/customer-portal/profile/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading profile...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">My Profile Settings</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Manage your user profile and security preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info & Password edit */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit form */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b pb-3 border-slate-100">
              <Settings size={14} className="text-indigo-500" /> Contact Information
            </h4>
            <form onSubmit={handleUpdateContact} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                  />
                </div>
              </div>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md transition-all">
                Save Contact Info
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b pb-3 border-slate-100">
              <Key size={14} className="text-indigo-500" /> Account Security
            </h4>
            <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md transition-all">
                Update Password
              </button>
            </form>
          </div>
        </div>

        {/* Company profile Details */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b pb-3 border-slate-100">
            <Building2 size={14} className="text-indigo-500" /> Company Parameters
          </h4>

          {profile?.company ? (
            <div className="space-y-4 text-xs font-bold text-slate-600">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Company Profile</p>
                <p className="text-slate-800 text-[13px] font-black">{profile.company.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GST Identification (GSTIN)</p>
                <p className="text-slate-800 font-extrabold">{profile.company.gstNumber || "Not registered"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tax PAN Identifier</p>
                <p className="text-slate-800 font-extrabold">{profile.company.pan || "Not provided"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Main Branches / Addresses</p>
                <p className="text-slate-800 leading-relaxed">{profile.company.address || "Standard Corporate Address"}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 space-y-2">
              <AlertCircle size={20} className="mx-auto" />
              <p className="text-[10px] font-bold uppercase">No company record linked to this profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
