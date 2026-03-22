
import React, { useState, useEffect } from 'react';
import { listAllCoupons, addAdminCoupon, deleteCoupon } from '../services/couponService';
import { X, Plus, Trash2, Search, RefreshCw, UserCheck, UserMinus, Calendar } from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await listAllCoupons();
      setCoupons(data);
    } catch (error) {
      console.error("Erro ao carregar cupons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    }
  }, [isOpen]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes('@')) return;
    
    setActionLoading('add');
    try {
      await addAdminCoupon(newEmail);
      setNewEmail('');
      await fetchCoupons();
    } catch (error) {
      alert("Erro ao adicionar e-mail.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de ${id}?`)) return;
    
    setActionLoading(id);
    try {
      await deleteCoupon(id);
      await fetchCoupons();
    } catch (error) {
      alert("Erro ao remover acesso.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-blue-600" />
              Gestão de Acessos
            </h2>
            <p className="text-sm text-gray-500">Gerencie e-mails de compradores e códigos de acesso</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Quick Add Form */}
        <div className="p-6 bg-white border-b border-gray-100">
          <form onSubmit={handleAddEmail} className="flex gap-3">
            <div className="relative flex-1">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Adicionar e-mail do comprador..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading === 'add'}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:bg-blue-300 flex items-center gap-2"
            >
              {actionLoading === 'add' ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Liberar Acesso'}
            </button>
          </form>
        </div>

        {/* Search and List */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por e-mail ou código..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-200 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Carregando base de dados...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Identificador</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimento</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 italic">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{coupon.codigo || coupon.id}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{coupon.id}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            coupon.status === 'usado' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {coupon.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {coupon.data_vencimento 
                              ? new Date(coupon.data_vencimento.toDate()).toLocaleDateString('pt-BR')
                              : 'Pendente'}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={actionLoading === coupon.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remover Acesso"
                          >
                            {actionLoading === coupon.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
          <span>Total de registros: {coupons.length}</span>
          <span>Logado como: fabricio.marcato@gmail.com</span>
        </div>
      </div>
    </div>
  );
}
