"use client";
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function AddAssetModal({ 
  isOpen, onClose, onSave, assetToEdit 
}: { 
  isOpen: boolean, onClose: () => void, onSave: () => void, assetToEdit?: any 
}) {
  const [formData, setFormData] = useState({
    type: 'House', name: '', address: '', tenant_name: '', tenant_contact: '',
    lease_start: '', lease_end: '', monthly_rent: '', security_deposit: ''
  });
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Populate form when editing
  useEffect(() => {
    if (assetToEdit && isOpen) {
      setFormData({
        type: assetToEdit.type || 'House',
        name: assetToEdit.name || '',
        address: assetToEdit.address || '',
        tenant_name: assetToEdit.tenant_name || '',
        tenant_contact: assetToEdit.tenant_contact || '',
        lease_start: assetToEdit.lease_start || '',
        lease_end: assetToEdit.lease_end || '',
        monthly_rent: assetToEdit.monthly_rent?.toString() || '',
        security_deposit: assetToEdit.security_deposit?.toString() || ''
      });
    } else if (!assetToEdit && isOpen) {
      // Reset form when adding new
      setFormData({ type: 'House', name: '', address: '', tenant_name: '', tenant_contact: '', lease_start: '', lease_end: '', monthly_rent: '', security_deposit: '' });
    }
  }, [assetToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      ...formData,
      monthly_rent: parseFloat(formData.monthly_rent) || 0,
      security_deposit: parseFloat(formData.security_deposit) || 0,
    };

    let savedAsset = null;
    let error = null;

    if (assetToEdit) {
      // UPDATE EXISTING
      const res = await supabase.from('assets').update(payload).eq('id', assetToEdit.id).select().single();
      savedAsset = res.data;
      error = res.error;
    } else {
      // INSERT NEW
      const res = await supabase.from('assets').insert([{ ...payload, user_id: user?.id }]).select().single();
      savedAsset = res.data;
      error = res.error;
    }

    if (!error && savedAsset) {
      // Sync with Google Calendar
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', asset: savedAsset })
      });
      
      onSave();
      onClose();
    } else {
      alert("Error saving asset: " + error?.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold">{assetToEdit ? 'Edit Asset' : 'Add New Property / Land Asset'}</h2>
            <p className="text-xs text-gray-500">Enter real estate credentials for automated accounting & monitoring</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Asset Classification</h3>
            <div className="flex gap-2">
              {['House', 'Apartment', 'Empty Land', 'Commercial'].map((t) => (
                <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`px-4 py-2 text-sm rounded-lg border ${formData.type === t ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">Property Identification</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name / Title Identifier</label>
              <input required type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Address / County Parcel Registry</label>
              <input required type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">Tenancy & Cashflow Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary Tenant Name</label>
                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone / Email</label>
                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.tenant_contact} onChange={e => setFormData({...formData, tenant_contact: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Lease Start Date</label>
                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={formData.lease_start} onChange={e => setFormData({...formData, lease_start: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Lease End Date</label>
                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={formData.lease_end} onChange={e => setFormData({...formData, lease_end: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Rent ($)</label>
                <input type="number" className="w-full p-2 border rounded-lg text-sm" value={formData.monthly_rent} onChange={e => setFormData({...formData, monthly_rent: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Security Deposit ($)</label>
                <input type="number" className="w-full p-2 border rounded-lg text-sm" value={formData.security_deposit} onChange={e => setFormData({...formData, security_deposit: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {loading ? 'Saving...' : assetToEdit ? 'Update Asset' : 'Save & Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}