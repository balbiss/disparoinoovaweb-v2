import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Charge {
  id: string;
  contactId: string;
  amount: string | number;
  dueDate: string;
  status: string;
  pixCopiaCola?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  sentAt?: string;
  contact?: {
    nome: string;
    telefone: string;
    categoria?: {
      nome: string;
    };
  };
}

interface RecurringCharge {
  id: string;
  tenantId: string;
  contactId?: string;
  categoryId?: string;
  amount: string | number;
  dayOfMonth: number;
  description?: string;
  active: boolean;
  lastGeneratedAt?: string;
  createdAt: string;
  contact?: {
    nome: string;
    telefone: string;
  };
  category?: {
    nome: string;
  };
}

interface Contact {
  id: string;
  nome: string;
  telefone: string;
}

interface ContactTag {
  id: string;
  nome: string;
}

export function BillingPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'recurring'>('single');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [recurringCharges, setRecurringCharges] = useState<RecurringCharge[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [billingMode, setBillingMode] = useState<'individual' | 'category'>('individual');
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { user } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Load charges
      const res = await authenticatedFetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setCharges(data);
        setSelectedIds([]); // Clear selection when data reloads
      }

      // Load recurring
      const resRec = await authenticatedFetch('/api/billing/recurring');
      if (resRec.ok) {
        setRecurringCharges(await resRec.json());
      }
      
      // Load contacts for dropdown
      const resContacts = await authenticatedFetch('/api/contatos');
      if (resContacts.ok) {
        const data = await resContacts.json();
        setContacts(data.contacts || []);
      }

      // Load categories for bulk billing
      const resTags = await authenticatedFetch('/api/campaigns/tags');
      if (resTags.ok) {
        const tags = await resTags.json();
        setCategories(tags);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar cobranças');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billingMode === 'individual' && !selectedContact) {
      toast.error('Selecione um contato');
      return;
    }
    if (billingMode === 'category' && !selectedCategory) {
      toast.error('Selecione uma categoria');
      return;
    }
    if (isRecurring && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      toast.error('Informe um dia de vencimento válido (1 a 31)');
      return;
    }
    if (!isRecurring && !dueDate) {
      toast.error('Preencha a data de vencimento');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const endpoint = isRecurring ? '/api/billing/recurring' : '/api/billing';
      const bodyData = isRecurring ? {
        contactId: billingMode === 'individual' ? selectedContact : undefined,
        categoryId: billingMode === 'category' ? selectedCategory : undefined,
        amount: parseFloat(amount),
        dayOfMonth: Number(dayOfMonth),
        description
      } : {
        contactId: billingMode === 'individual' ? selectedContact : undefined,
        categoryId: billingMode === 'category' ? selectedCategory : undefined,
        amount: parseFloat(amount),
        dueDate,
        description
      };

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          toast.success(`${result.created} cobrança(s) gerada(s) com sucesso no Mercado Pago!`);
          if (result.errors) {
            toast.error(`Atenção: Houve falha em ${result.errors.length} contato(s).`);
          }
        } else {
          toast.success('Cobrança gerada com sucesso no Mercado Pago!');
        }
        
        setIsModalOpen(false);
        // Reset form
        setSelectedContact('');
        setSelectedCategory('');
        setAmount('');
        setDueDate('');
        setIsRecurring(false);
        setDayOfMonth('');
        setDescription('');
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao gerar cobrança. Verifique suas chaves do Mercado Pago.');
      }
    } catch (error) {
      toast.error('Erro de conexão ao gerar cobrança');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja cancelar e excluir esta cobrança?')) return;
    
    try {
      const res = await authenticatedFetch(`/api/billing/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cobrança deletada com sucesso!');
        loadData();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar cobrança');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm('Deseja cancelar esta assinatura recorrente? As faturas já geradas continuarão existindo.')) return;
    
    try {
      const res = await authenticatedFetch(`/api/billing/recurring/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Assinatura cancelada com sucesso!');
        loadData();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} cobrança(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await authenticatedFetch('/api/billing/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!res.ok) throw new Error('Falha ao deletar cobranças');
      
      toast.success(`${selectedIds.length} cobrança(s) deletada(s) com sucesso!`);
      loadData();
    } catch (error) {
      console.error('Erro ao deletar em massa:', error);
      toast.error('Erro ao deletar cobranças selecionadas');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === charges.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(charges.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await authenticatedFetch(`/api/billing/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success('Status atualizado com sucesso!');
        loadData();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusDropdown = (charge: any) => {
    const statusColors: any = {
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      EXPIRED: 'bg-orange-100 text-orange-800'
    };

    return (
      <select
        value={charge.status}
        onChange={(e) => handleStatusChange(charge.id, e.target.value)}
        className={`px-2 py-1 text-xs rounded-full font-medium border-0 cursor-pointer focus:ring-0 outline-none appearance-none ${statusColors[charge.status] || statusColors.PENDING}`}
        style={{ textAlignLast: 'center' }}
      >
        <option value="PENDING" className="bg-white text-gray-900">Pendente</option>
        <option value="PAID" className="bg-white text-gray-900">Pago</option>
        <option value="CANCELLED" className="bg-white text-gray-900">Cancelado</option>
        <option value="EXPIRED" className="bg-white text-gray-900">Expirado</option>
      </select>
    );
  };

  return (
    <>
      <Header title="Cobranças e Faturas" subtitle="Gerencie as cobranças dos seus clientes via Mercado Pago" />
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'single' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('single')}
            >
              Lançamentos Pendentes
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'recurring' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('recurring')}
            >
              Assinaturas Recorrentes
            </button>
          </div>
          <div className="flex gap-2">
            {activeTab === 'single' && selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="btn text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
              >
                Excluir Selecionados ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              + Nova Cobrança
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'single' ? (
          charges.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              Nenhuma cobrança encontrada. Crie uma nova cobrança para começar.
            </div>
          ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={charges.length > 0 && selectedIds.length === charges.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado em</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {charges.map((charge) => (
                    <tr key={charge.id} className={selectedIds.includes(charge.id) ? "bg-blue-50" : "hover:bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.includes(charge.id)}
                          onChange={() => toggleSelect(charge.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{charge.contact?.nome || 'Contato excluído'}</div>
                        <div className="text-sm text-gray-500">{charge.contact?.telefone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {charge.contact?.categoria?.nome ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {charge.contact.categoria.nome}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        R$ {Number(charge.amount).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {charge.dueDate.split('T')[0].split('-').reverse().join('/')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusDropdown(charge)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                        {charge.sentAt ? new Date(charge.sentAt).toLocaleString('pt-BR') : 'Não enviado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {charge.boletoUrl && (
                          <a href={charge.boletoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            💳 Link de Pagamento
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(charge.id)} className="text-red-600 hover:text-red-900">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        ) : (
          recurringCharges.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              Nenhuma assinatura recorrente encontrada.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente/Categoria</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Geração</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recurringCharges.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rec.contact ? (
                            <div>
                              <div className="font-medium text-gray-900">{rec.contact.nome}</div>
                              <div className="text-sm text-gray-500">{rec.contact.telefone}</div>
                            </div>
                          ) : rec.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Categoria: {rec.category.nome}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          R$ {Number(rec.amount).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          Todo dia {rec.dayOfMonth}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                          {rec.lastGeneratedAt ? new Date(rec.lastGeneratedAt).toLocaleDateString('pt-BR') : 'Nunca'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleDeleteRecurring(rec.id)} className="text-red-600 hover:text-red-900">
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal Nova Cobrança */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nova Cobrança</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateCharge} className="space-y-4">
              
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  type="button" 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md ${billingMode === 'individual' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                  onClick={() => setBillingMode('individual')}
                >
                  Contato Individual
                </button>
                <button 
                  type="button" 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md ${billingMode === 'category' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                  onClick={() => setBillingMode('category')}
                >
                  Por Categoria
                </button>
              </div>

              {billingMode === 'individual' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contato (Devedor) *</label>
                  <select 
                    className="input-field py-2"
                    value={selectedContact}
                    onChange={e => setSelectedContact(e.target.value)}
                    required={billingMode === 'individual'}
                  >
                    <option value="">Selecione o contato...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria de Contatos *</label>
                  <select 
                    className="input-field py-2"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    required={billingMode === 'category'}
                  >
                    <option value="">Selecione a categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Será gerada uma cobrança individual para cada contato dentro desta categoria.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="input-field py-2"
                  placeholder="Ex: 50.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                  Cobrança Recorrente (Gerar automaticamente todo mês)
                </label>
              </div>

              {isRecurring ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dia de Vencimento *</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    className="input-field py-2"
                    placeholder="Ex: 5"
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(Number(e.target.value))}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">O link de pagamento será gerado 5 dias antes desta data todo mês.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    className="input-field py-2"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <input 
                  type="text" 
                  className="input-field py-2"
                  placeholder="Ex: Mensalidade Maio"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-2">
                  {isSubmitting ? 'Gerando...' : 'Gerar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
