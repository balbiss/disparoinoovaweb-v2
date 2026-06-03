import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { PerfexSyncModal } from '../components/PerfexSyncModal';

interface Settings {
  id: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  chatwootUrl?: string;
  chatwootAccountId?: string;
  chatwootApiToken?: string;
  perfexUrl?: string;
  perfexToken?: string;
  apifyApiToken?: string;
  mpAccessToken?: string;
  mpPublicKey?: string;
}

const settingsSchema = z.object({
  openaiApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),
  chatwootUrl: z.string().optional(),
  chatwootAccountId: z.string().optional(),
  chatwootApiToken: z.string().optional(),
  perfexUrl: z.string().optional(),
  perfexToken: z.string().optional(),
  apifyApiToken: z.string().optional(),
  mpAccessToken: z.string().optional(),
  mpPublicKey: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'openai' | 'groq' | 'chatwoot' | 'perfex' | 'apify' | 'mercadopago' | null>(null);
  const { user } = useAuth();

  // Helper para fazer requisições autenticadas
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };


  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    onErrors: (errors) => {
      console.log('🔴 Erros de validação:', errors);
    }
  });

  useEffect(() => {
    loadSettings();

    // Listen for tenant changes from header selector
    const handleTenantChange = () => {
      loadSettings();
    };

    window.addEventListener('superadmin-tenant-changed', handleTenantChange);
    return () => {
      window.removeEventListener('superadmin-tenant-changed', handleTenantChange);
    };
  }, [user]);

  const loadSettings = async () => {
    try {
      let url = '/api/settings';

      if (user?.role === 'SUPERADMIN') {
        const selectedTenantId = localStorage.getItem('superadmin_selected_tenant');
        if (selectedTenantId) {
          url = `/api/settings?tenantId=${selectedTenantId}`;
        }
      }

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setValue('openaiApiKey', data.openaiApiKey || '');
        setValue('groqApiKey', data.groqApiKey || '');
        setValue('chatwootUrl', data.chatwootUrl || '');
        setValue('chatwootAccountId', data.chatwootAccountId || '');
        setValue('chatwootApiToken', data.chatwootApiToken || '');
        setValue('perfexUrl', data.perfexUrl || '');
        setValue('perfexToken', data.perfexToken || '');
        setValue('apifyApiToken', data.apifyApiToken || '');
        setValue('mpAccessToken', data.mpAccessToken || '');
        setValue('mpPublicKey', data.mpPublicKey || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      let requestData = data;

      if (user?.role === 'SUPERADMIN') {
        const selectedTenantId = localStorage.getItem('superadmin_selected_tenant');
        if (selectedTenantId) {
          requestData = { ...data, tenantId: selectedTenantId };
        }
      }

      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const responseData = await response.json();
        toast.success('Configurações de integração salvas com sucesso');
        setActiveModal(null);
        await loadSettings();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao salvar configurações de integração');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de integração:', error);
      toast.error('Erro ao salvar configurações de integração');
    }
  };

  const removeIntegration = async (type: 'openai' | 'groq' | 'chatwoot' | 'perfex' | 'apify' | 'mercadopago') => {
    const integrationNames = {
      openai: 'OpenAI',
      groq: 'Groq',
      chatwoot: 'Chatwoot',
      perfex: 'Perfex CRM',
      apify: 'Apify',
      mercadopago: 'Mercado Pago'
    };

    if (!confirm(`Tem certeza que deseja remover a integração com ${integrationNames[type]}?`)) {
      return;
    }

    try {
      let requestData: any = {};

      if (type === 'openai') {
        requestData.openaiApiKey = '';
      } else if (type === 'groq') {
        requestData.groqApiKey = '';
      } else if (type === 'chatwoot') {
        requestData.chatwootUrl = '';
        requestData.chatwootAccountId = '';
        requestData.chatwootApiToken = '';
      } else if (type === 'perfex') {
        requestData.perfexUrl = '';
        requestData.perfexToken = '';
      } else if (type === 'apify') {
        requestData.apifyApiToken = '';
      } else if (type === 'mercadopago') {
        requestData.mpAccessToken = '';
        requestData.mpPublicKey = '';
      }

      if (user?.role === 'SUPERADMIN') {
        const selectedTenantId = localStorage.getItem('superadmin_selected_tenant');
        if (selectedTenantId) {
          requestData.tenantId = selectedTenantId;
        }
      }

      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success(`Integração com ${integrationNames[type]} removida com sucesso`);
        setActiveModal(null);
        await loadSettings();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao remover integração');
      }
    } catch (error) {
      console.error('Erro ao remover integração:', error);
      toast.error('Erro ao remover integração');
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando configurações...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Configurações"
        subtitle="Configure as definições do sistema"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
              🔗 Integrações de IA
            </h2>
            <p className="text-gray-600 mb-6">
              Configure as chaves de API para usar inteligência artificial nas campanhas
            </p>


            <div className="flex flex-col gap-4">
              {/* OpenAI Button */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                      <img src="https://www.google.com/s2/favicons?domain=openai.com&sz=128" alt="OpenAI" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">OpenAI</h3>
                      <p className="text-sm text-gray-500">ChatGPT, GPT-4</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      settings?.openaiApiKey
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {settings?.openaiApiKey ? 'Configurado' : 'Não configurado'}
                    </span>
                    <button
                      onClick={() => setActiveModal('openai')}
                      className="btn-primary py-1 px-3 text-sm"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              </div>

              {/* Groq Button */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                      <img src="https://www.google.com/s2/favicons?domain=groq.com&sz=128" alt="Groq" className="w-6 h-6 object-contain rounded-sm" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Groq</h3>
                      <p className="text-sm text-gray-500">LLaMA, Mixtral (ultra-rápido)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      settings?.groqApiKey
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {settings?.groqApiKey ? 'Configurado' : 'Não configurado'}
                    </span>
                    <button
                      onClick={() => setActiveModal('groq')}
                      className="btn-primary py-1 px-3 text-sm"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integração Chatwoot */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
              💬 Integração Chatwoot
            </h2>
            <p className="text-gray-600 mb-6">
              Configure a integração com Chatwoot para sincronizar conversas
            </p>

            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <img src="https://www.google.com/s2/favicons?domain=chatwoot.com&sz=128" alt="Chatwoot" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Chatwoot</h3>
                    <p className="text-sm text-gray-500">Plataforma de atendimento ao cliente</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    settings?.chatwootUrl && settings?.chatwootAccountId && settings?.chatwootApiToken
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings?.chatwootUrl && settings?.chatwootAccountId && settings?.chatwootApiToken ? 'Configurado' : 'Não configurado'}
                  </span>
                  <button
                    onClick={() => setActiveModal('chatwoot')}
                    className="btn-primary py-1 px-3 text-sm"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Integração Perfex CRM */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
              🔧 Integração Perfex CRM
            </h2>
            <p className="text-gray-600 mb-6">
              Configure a integração com Perfex CRM para sincronizar clientes e leads
            </p>

            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <img src="https://www.google.com/s2/favicons?domain=perfexcrm.com&sz=128" alt="Perfex CRM" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Perfex CRM</h3>
                    <p className="text-sm text-gray-500">Sistema de gestão de clientes e projetos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    settings?.perfexUrl && settings?.perfexToken
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings?.perfexUrl && settings?.perfexToken ? 'Configurado' : 'Não configurado'}
                  </span>
                  <button
                    onClick={() => setActiveModal('perfex')}
                    className="btn-primary py-1 px-3 text-sm"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Integração Apify */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
              🗺️ Integração Apify
            </h2>
            <p className="text-gray-600 mb-6">
              Configure o token para permitir a Extração de Leads do Google Maps
            </p>

            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <img src="https://www.google.com/s2/favicons?domain=apify.com&sz=128" alt="Apify" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Apify</h3>
                    <p className="text-sm text-gray-500">Extração de Leads do Google Maps</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    settings?.apifyApiToken
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings?.apifyApiToken ? 'Configurado' : 'Não configurado'}
                  </span>
                  <button
                    onClick={() => setActiveModal('apify')}
                    className="btn-primary py-1 px-3 text-sm"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Integração Mercado Pago */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">
              💳 Integração Mercado Pago
            </h2>
            <p className="text-gray-600 mb-6">
              Configure as credenciais para emitir cobranças (PIX / Boleto) direto na sua conta
            </p>

            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <img src="https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=128" alt="Mercado Pago" className="w-7 h-7 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Mercado Pago</h3>
                    <p className="text-sm text-gray-500">Cobranças e Faturamento</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    settings?.mpAccessToken
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings?.mpAccessToken ? 'Configurado' : 'Não configurado'}
                  </span>
                  <button
                    onClick={() => setActiveModal('mercadopago')}
                    className="btn-primary py-1 px-3 text-sm"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Integração Asaas (Em Breve) */}
          <div className="bg-white rounded-lg shadow p-6 opacity-80 cursor-not-allowed">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 flex items-center gap-2">
              🏦 Integração Asaas
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium ml-auto">
                Em breve
              </span>
            </h2>
            <p className="text-gray-600 mb-6">
              Emissão de cobranças, links de pagamento e gestão financeira completa com o Asaas
            </p>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between opacity-70">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                    <img src="https://www.google.com/s2/favicons?domain=asaas.com&sz=128" alt="Asaas" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Asaas</h3>
                    <p className="text-sm text-gray-500">Conta digital PJ</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled
                    className="bg-gray-200 text-gray-500 py-1 px-3 text-sm rounded cursor-not-allowed font-medium"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modais de Integração */}


      {/* Modal OpenAI */}
      {activeModal === 'openai' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🤖 Configurar OpenAI</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key OpenAI
                </label>
                <input
                  id="openaiApiKey"
                  type="password"
                  {...register('openaiApiKey')}
                  placeholder="sk-..."
                  className="input-field py-2"
                />
                {errors.openaiApiKey && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.openaiApiKey.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Chave API para integração com ChatGPT nas campanhas
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancelar
                </button>
                {settings?.openaiApiKey && (
                  <button
                    type="button"
                    onClick={() => removeIntegration('openai')}
                    disabled={isSubmitting}
                    className="btn-danger flex-1 py-2"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Groq */}
      {activeModal === 'groq' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">⚡ Configurar Groq</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="groqApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key Groq
                </label>
                <input
                  id="groqApiKey"
                  type="password"
                  {...register('groqApiKey')}
                  placeholder="gsk_..."
                  className="input-field py-2"
                />
                {errors.groqApiKey && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.groqApiKey.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Chave API para integração com Groq AI nas campanhas (modelos rápidos e eficientes)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancelar
                </button>
                {settings?.groqApiKey && (
                  <button
                    type="button"
                    onClick={() => removeIntegration('groq')}
                    disabled={isSubmitting}
                    className="btn-danger flex-1 py-2"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chatwoot */}
      {activeModal === 'chatwoot' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">💬 Configurar Chatwoot</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="chatwootUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Chatwoot *
                </label>
                <input
                  id="chatwootUrl"
                  type="url"
                  {...register('chatwootUrl')}
                  placeholder="https://app.chatwoot.com"
                  className="input-field py-2"
                />
                {errors.chatwootUrl && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.chatwootUrl.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  URL completa da sua instância Chatwoot
                </p>
              </div>

              <div>
                <label htmlFor="chatwootAccountId" className="block text-sm font-medium text-gray-700 mb-1">
                  ID da Conta *
                </label>
                <input
                  id="chatwootAccountId"
                  type="text"
                  {...register('chatwootAccountId')}
                  placeholder="123456"
                  className="input-field py-2"
                />
                {errors.chatwootAccountId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.chatwootAccountId.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  ID numérico da sua conta no Chatwoot
                </p>
              </div>

              <div>
                <label htmlFor="chatwootApiToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Token de API *
                </label>
                <input
                  id="chatwootApiToken"
                  type="password"
                  {...register('chatwootApiToken')}
                  placeholder="••••••••••••••••"
                  className="input-field py-2"
                />
                {errors.chatwootApiToken && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.chatwootApiToken.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Token de API do seu perfil (encontrado em Configurações &gt; Perfil)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancelar
                </button>
                {settings?.chatwootUrl && settings?.chatwootAccountId && settings?.chatwootApiToken && (
                  <button
                    type="button"
                    onClick={() => removeIntegration('chatwoot')}
                    disabled={isSubmitting}
                    className="btn-danger flex-1 py-2"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Perfex CRM */}
      <PerfexSyncModal
        isOpen={activeModal === 'perfex'}
        onClose={() => setActiveModal(null)}
        perfexUrl={settings?.perfexUrl || ''}
        perfexToken={settings?.perfexToken || ''}
        onSave={async (url, token) => {
          try {
            let requestData: any = {
              perfexUrl: url,
              perfexToken: token
            };

            if (user?.role === 'SUPERADMIN') {
              const selectedTenantId = localStorage.getItem('superadmin_selected_tenant');
              if (selectedTenantId) {
                requestData.tenantId = selectedTenantId;
              }
            }

            const response = await authenticatedFetch('/api/settings', {
              method: 'PUT',
              body: JSON.stringify(requestData),
            });

            if (response.ok) {
              toast.success('Integração com Perfex CRM configurada com sucesso');
              await loadSettings();
            } else {
              const errorData = await response.json();
              toast.error(errorData.error || 'Erro ao configurar Perfex CRM');
            }
          } catch (error) {
            console.error('Erro ao configurar Perfex CRM:', error);
            toast.error('Erro ao configurar Perfex CRM');
          }
        }}
      />

      {/* Modal Apify */}
      {activeModal === 'apify' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🗺️ Configurar Apify</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="apifyApiToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Token de API (Apify)
                </label>
                <input
                  id="apifyApiToken"
                  type="password"
                  {...register('apifyApiToken')}
                  placeholder="apify_api_..."
                  className="input-field py-2"
                />
                {errors.apifyApiToken && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.apifyApiToken.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Para pegar seu token, crie uma conta gratuita no <a href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Apify</a> e copie o Personal API Token.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancelar
                </button>
                {settings?.apifyApiToken && (
                  <button
                    type="button"
                    onClick={() => removeIntegration('apify')}
                    disabled={isSubmitting}
                    className="btn-danger flex-1 py-2"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mercado Pago */}
      {activeModal === 'mercadopago' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">💳 Configurar Mercado Pago</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="mpAccessToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token (Produção)
                </label>
                <input
                  id="mpAccessToken"
                  type="password"
                  {...register('mpAccessToken')}
                  placeholder="APP_USR-..."
                  className="input-field py-2"
                />
                {errors.mpAccessToken && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.mpAccessToken.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="mpPublicKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Public Key (Produção)
                </label>
                <input
                  id="mpPublicKey"
                  type="text"
                  {...register('mpPublicKey')}
                  placeholder="APP_USR-..."
                  className="input-field py-2"
                />
                {errors.mpPublicKey && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.mpPublicKey.message}
                  </p>
                )}
              </div>

              {settings?.mpAccessToken && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Sua URL de Webhook:</h4>
                  <p className="text-xs text-blue-800 mb-2">
                    Copie a URL abaixo e cole nas configurações de Notificações Webhook do seu painel do Mercado Pago:
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="text-xs bg-white px-2 py-1 rounded border flex-1 break-all select-all">
                      {window.location.origin}/api/webhooks/mercadopago/billing/{user?.tenant?.slug || 'sua-empresa'}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancelar
                </button>
                {settings?.mpAccessToken && (
                  <button
                    type="button"
                    onClick={() => removeIntegration('mercadopago')}
                    disabled={isSubmitting}
                    className="btn-danger flex-1 py-2"
                  >
                    Remover
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}