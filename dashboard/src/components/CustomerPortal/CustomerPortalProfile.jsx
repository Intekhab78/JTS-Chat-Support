import React, { useState, useEffect } from "react";
import { Key, Settings, Building2, UserCheck, ShieldCheck } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalProfile() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api("/api/crm/customer-portal/profile");
      setProfile(res);
      setName(res?.customer?.name || res?.user?.name || "");
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
    if (savingContact) return;
    setSavingContact(true);
    try {
      await api("/api/crm/customer-portal/profile", {
        method: "PUT",
        body: JSON.stringify({ name, phone })
      });
      toast.success("Profile contact information updated");
      fetchProfile();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || savingPassword) return;
    setSavingPassword(true);
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
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <p className="text-center py-10 text-slate-400 text-xs font-semibold">Loading profile...</p>;
  }

  const displayName = profile?.customer?.name || profile?.user?.name || "Customer";
  const displayEmail = profile?.user?.email || profile?.customer?.email || "—";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-3">
      {/* Compact Profile Identity Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 truncate">{displayName}</h3>
              {profile?.customer?.crn && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  {profile.customer.crn}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-semibold">
          <UserCheck size={11} /> Verified Account
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        <div className="space-y-3 lg:col-span-2">
          {/* Contact Information */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
              <Settings size={13} className="text-indigo-600" /> Contact Information
            </h4>
            <form onSubmit={handleUpdateContact} className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Add phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Email Address</label>
                  <input
                    type="text"
                    value={displayEmail}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Customer Reference (CRN)</label>
                  <input
                    type="text"
                    value={profile?.customer?.crn || "—"}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold transition-colors"
                >
                  {savingContact ? "Saving..." : "Save Contact Info"}
                </button>
              </div>
            </form>
          </div>

          {/* Account Security */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
              <Key size={13} className="text-indigo-600" /> Account Security
            </h4>
            <form onSubmit={handleChangePassword} className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold transition-colors"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Company & Account Summary */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
            <Building2 size={13} className="text-indigo-600" /> {profile?.company ? "Company Details" : "Account Overview"}
          </h4>

          {profile?.company ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-[11px] text-slate-500">Company</span>
                <span className="font-semibold text-slate-900 text-right">{profile.company.name || "—"}</span>
              </div>
              {profile.company.gstNumber && (
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Tax / Reg ID</span>
                  <span className="font-semibold text-slate-800 text-right">{profile.company.gstNumber}</span>
                </div>
              )}
              {profile.company.pan && (
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Tax Identifier</span>
                  <span className="font-semibold text-slate-800 text-right">{profile.company.pan}</span>
                </div>
              )}
              {profile.company.industry && (
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Industry</span>
                  <span className="font-medium text-slate-700 text-right">{profile.company.industry}</span>
                </div>
              )}
              {profile.company.address && (
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Address</span>
                  <p className="text-[11px] text-slate-700 leading-snug mt-0.5">{profile.company.address}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-[11px] text-slate-500">Account Holder</span>
                <span className="font-semibold text-slate-900 text-right">{displayName}</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-[11px] text-slate-500">CRN</span>
                <span className="font-semibold text-slate-800 text-right">{profile?.customer?.crn || "—"}</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-[11px] text-slate-500">Phone</span>
                <span className="font-medium text-slate-700 text-right">{profile?.customer?.phone || "Not added"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-500">Portal Access</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck size={12} /> Active
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
