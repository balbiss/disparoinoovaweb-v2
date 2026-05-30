import React, { useState } from 'react';
import { Header } from '../components/Header';
import { FiSearch, FiMapPin, FiDownload, FiCheck, FiX, FiSmartphone, FiPhone, FiInstagram, FiLinkedin, FiFacebook, FiMap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCategories } from '../hooks/useCategories';
import { CategoryForm } from '../components/CategoryForm';

interface Lead {
  name: string;
  phone: string;
  whatsapp: string | null;
  isMobile: boolean;
  address: string;
  website: string;
  googleUrl: string;
}

type ExtractionSource = 'google' | 'instagram' | 'linkedin' | 'facebook';

export function LeadExtractorPage() {
  // Google Maps State
  const [searchString, setSearchString] = useState('');
  const [location, setLocation] = useState('');

  // Instagram State
  const [instagramTarget, setInstagramTarget] = useState('');

  // LinkedIn State
  const [linkedinJobTitle, setLinkedinJobTitle] = useState('');
  const [linkedinLocation, setLinkedinLocation] = useState('');

  // Facebook State
  const [facebookNiche, setFacebookNiche] = useState('');
  const [facebookCity, setFacebookCity] = useState('');

  // Shared State
  const [activeSource, setActiveSource] = useState<ExtractionSource>('google');
  const [maxLeads, setMaxLeads] = useState(50);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [showOnlyMobile, setShowOnlyMobile] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);

  const { categories, refresh: refreshCategories } = useCategories({ pageSize: 100 });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    let endpoint = '/api/leads/extract';
    let payload: any = { maxLeads };

    if (activeSource === 'google') {
      if (!searchString || !location) {
        toast.error('Preencha o termo de busca e a localização');
        return;
      }
      payload = { ...payload, searchString, location };
    } else if (activeSource === 'instagram') {
      if (!instagramTarget) {
        toast.error('Preencha o perfil ou hashtag');
        return;
      }
      endpoint = '/api/leads/extract/instagram';
      payload = { ...payload, target: instagramTarget };
    } else if (activeSource === 'linkedin') {
      if (!linkedinJobTitle || !linkedinLocation) {
        toast.error('Preencha o cargo e a localidade');
        return;
      }
      endpoint = '/api/leads/extract/linkedin';
      payload = { ...payload, jobTitle: linkedinJobTitle, location: linkedinLocation };
    } else if (activeSource === 'facebook') {
      if (!facebookNiche || !facebookCity) {
        toast.error('Preencha o nicho e a cidade');
        return;
      }
      endpoint = '/api/leads/extract/facebook';
      payload = { ...payload, niche: facebookNiche, city: facebookCity };
    }

    setLoading(true);
    setLeads([]);
    setSelectedLeads(new Set());

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao extrair leads');
      }

      setLeads(data.leads || []);
      toast.success(`${data.count} leads extraídos com sucesso!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = showOnlyMobile ? leads.filter(l => l.isMobile) : leads;

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((_, i) => i)));
    }
  };

  const toggleSelect = (index: number) => {
    const newSet = new Set(selectedLeads);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedLeads(newSet);
  };

  const handleImport = async () => {
    if (selectedLeads.size === 0) return;

    const leadsToImport = Array.from(selectedLeads).map(i => filteredLeads[i]);
    
    // Remove leads sem telefone
    const validLeads = leadsToImport.filter(l => l.phone || l.whatsapp);
    
    if (validLeads.length === 0) {
      toast.error('Nenhum lead selecionado possui telefone válido.');
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Format the data as CSV text for the existing CSV import endpoint
      let csvContent = "nome,telefone,tags,observacoes,categoriaid\n";
      validLeads.forEach(lead => {
        const phoneToUse = lead.whatsapp || lead.phone.replace(/\D/g, '');
        const sourceName = activeSource === 'google' ? 'Google Maps' : activeSource === 'instagram' ? 'Instagram' : activeSource === 'linkedin' ? 'LinkedIn' : 'Facebook Pages';
        csvContent += `"${lead.name.replace(/"/g, '""')}","${phoneToUse}","${sourceName}","Endereço: ${lead.address.replace(/"/g, '""')}","${selectedCategory}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('csv', blob, 'google-leads.csv');

      const response = await fetch('/api/csv/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao importar contatos');
      }

      if (data.failedCount > 0) {
        toast.success(`Foram importados ${data.importedCount} novos leads! (${data.failedCount} ignorados por já existirem)`);
      } else {
        toast.success(`Foram importados ${data.importedCount} leads para a sua lista de contatos!`);
      }
      
      // Limpar seleção
      setSelectedLeads(new Set());
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Header
        title="Extrator de Leads"
        subtitle="Encontre potenciais clientes no Google Maps"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                O que você procura?
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchString}
                  onChange={(e) => setSearchString(e.target.value)}
                  placeholder="Ex: Dentistas, Pizzarias..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Onde?
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Porto Alegre, RS..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Dica: Inclua a sigla do estado (ex: RS, SP)
              </p>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade Máxima
              </label>
              <select
                value={maxLeads}
                onChange={(e) => setMaxLeads(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value={20}>20 Leads</option>
                <option value={50}>50 Leads</option>
                <option value={100}>100 Leads</option>
                <option value={200}>200 Leads</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors h-[42px]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FiSearch />
                    <span>Buscar Leads</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel */}
        {leads.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-4">
                <h3 className="font-medium text-gray-900">
                  Resultados ({filteredLeads.length})
                </h3>
                <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={showOnlyMobile}
                    onChange={(e) => setShowOnlyMobile(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Mostrar apenas Celulares (WhatsApp)</span>
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 max-w-[200px]"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsCategoryFormOpen(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                >
                  + Nova Categoria
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedLeads.size === 0 || importing}
                  className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {importing ? (
                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <FiDownload />
                  )}
                  <span>Importar {selectedLeads.size > 0 ? selectedLeads.size : ''} Contatos</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-600">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 font-medium">Empresa</th>
                    <th className="p-4 font-medium">Telefone</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Endereço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors ${selectedLeads.has(index) ? 'bg-teal-50/30' : ''}`}
                      onClick={() => toggleSelect(index)}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(index)}
                          onChange={() => {}} // handled by tr click
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                            Site
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900">{lead.phone || <span className="text-gray-400">Sem telefone</span>}</div>
                      </td>
                      <td className="p-4">
                        {lead.isMobile ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            <FiSmartphone className="w-3 h-3" />
                            <span>Celular</span>
                          </span>
                        ) : lead.phone ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                            <FiPhone className="w-3 h-3" />
                            <span>Fixo</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600 truncate max-w-xs" title={lead.address}>
                          {lead.address || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhum lead encontrado com esse filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isCategoryFormOpen && (
        <CategoryForm
          onSuccess={() => {
            setIsCategoryFormOpen(false);
            refreshCategories();
          }}
          onCancel={() => setIsCategoryFormOpen(false)}
        />
      )}
    </>
  );
}
