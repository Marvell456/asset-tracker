"use client";
import { useState, useEffect } from 'react';
import { Plus, Home, Building2, TreePine, Search, ChevronDown, LogOut, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { differenceInDays, parseISO } from 'date-fns';
import AddAssetModal from '@/components/AddAssetModal';

export default function Dashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All Assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (data) {
      setAssets(data);
      setFilteredAssets(data);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  useEffect(() => {
    let result = assets;
    if (activeTab !== 'All Assets') result = result.filter(a => a.type === activeTab);
    if (searchQuery) {
      result = result.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.address.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredAssets(result);
  }, [activeTab, searchQuery, assets]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleDelete = async (asset: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${asset.name}?`)) return;

    // Delete from Google Calendar if it exists
    if (asset.google_event_id) {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', asset })
      });
    }

    // Delete from Database
    await supabase.from('assets').delete().eq('id', asset.id);
    fetchAssets();
  };

  const openAddModal = () => {
    setAssetToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssetToEdit(asset);
    setIsModalOpen(true);
  };

  const getIcon = (type: string) => {
    if (type === 'Apartment') return <Building2 className="w-5 h-5 text-gray-500" />;
    if (type === 'Empty Land') return <TreePine className="w-5 h-5 text-gray-500" />;
    return <Home className="w-5 h-5 text-gray-500" />;
  };

  const getStatusBadge = (endDate: string) => {
    if (!endDate) return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">No Lease</span>;
    const daysLeft = differenceInDays(parseISO(endDate), new Date());
    if (daysLeft < 0) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Expired</span>;
    if (daysLeft <= 30) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">Expiring in {daysLeft} Days</span>;
    return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">Occupied - Active Lease</span>;
  };

  const totalUnits = assets.length;
  const occupiedUnits = assets.filter(a => a.tenant_name).length;
  const occupancyYield = totalUnits ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0;
  const monthlyInflow = assets.reduce((sum, a) => sum + (Number(a.monthly_rent) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-black p-1.5 rounded-lg"><Home className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-bold text-gray-900">AssetTracker</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={openAddModal} className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-800">
            <Plus className="w-4 h-4" /> New Asset Entry
          </button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-black"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Asset Inventory & Performance</h2>

      {/* KPI Cards (Removed Review Items, changed to 3 columns) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { title: 'Portfolio Assets', val: `${totalUnits} Units`, sub: '$14,240,000 Valuation' },
          { title: 'Occupancy Yield', val: `${occupancyYield}%`, sub: `${occupiedUnits} Leased • ${totalUnits - occupiedUnits} Vacant` },
          { title: 'Monthly Inflow', val: `$${monthlyInflow.toLocaleString()}`, sub: '+4.2% YoY' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">{kpi.title}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.val}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['All Assets', 'House', 'Apartment', 'Empty Land', 'Commercial'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Search address, tenant..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:border-black" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === asset.id ? null : asset.id)}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">{getIcon(asset.type)}</div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{asset.type}</span>
                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                    {getStatusBadge(asset.lease_end)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Tenant: {asset.tenant_name || 'N/A'} • Lease ends {asset.lease_end || 'N/A'} • Parcel #{asset.id.slice(0,6).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={(e) => openEditModal(asset, e)} className="text-sm font-medium text-gray-600 hover:text-black px-3 py-1.5 border border-gray-200 rounded-lg">Edit Asset</button>
                <button onClick={(e) => handleDelete(asset, e)} className="text-sm font-medium text-red-600 hover:text-red-800 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === asset.id ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            {expandedId === asset.id && (
              <div className="bg-gray-50 p-6 border-t border-gray-100 grid grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Specifications</p>
                  <p className="text-gray-900">{asset.address}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tenant Terms</p>
                  <p className="text-gray-900">{asset.tenant_name} • {asset.tenant_contact}</p>
                  <p className="text-gray-500">Lease: {asset.lease_start} to {asset.lease_end}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Financials</p>
                  <p className="text-gray-900">Rent: ${asset.monthly_rent}/mo • Deposit: ${asset.security_deposit}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredAssets.length === 0 && <div className="text-center py-12 text-gray-500">No assets found. Click "New Asset Entry" to add one.</div>}
      </div>

      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchAssets} assetToEdit={assetToEdit} />
    </div>
  );
}