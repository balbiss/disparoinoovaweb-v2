import React, { useState } from 'react';
import { Header } from '../components/Header';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: any;
  response?: any;
}

const docsData: Record<string, { title: string; endpoints: Endpoint[]; description?: string }> = {
  auth: {
    title: 'Autenticação',
    description: 'Para utilizar a API, você deve obter um token Bearer através do endpoint de login e enviá-lo no cabeçalho `Authorization: Bearer SEU_TOKEN` de todas as requisições subsequentes.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Realiza a autenticação e retorna o token de acesso.',
        requestBody: {
          email: 'seu@email.com',
          senha: 'sua_senha'
        },
        response: {
          success: true,
          message: 'Login realizado com sucesso',
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
              id: 'uuid-do-usuario',
              nome: 'Seu Nome',
              email: 'seu@email.com',
              role: 'USER',
              ativo: true
            }
          }
        }
      }
    ]
  },
  contacts: {
    title: 'Contatos',
    endpoints: [
      {
        method: 'GET',
        path: '/api/contacts?page=1&limit=10',
        description: 'Lista os contatos salvos no tenant logado, com paginação.',
        response: {
          success: true,
          data: [
            {
              id: 'uuid-do-contato',
              nome: 'João Silva',
              telefone: '5511999999999',
              email: 'joao@email.com',
              tags: ['cliente', 'vip']
            }
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      },
      {
        method: 'POST',
        path: '/api/contacts',
        description: 'Cria um novo contato na agenda.',
        requestBody: {
          nome: 'Maria Silva',
          telefone: '5511888888888',
          email: 'maria@email.com',
          tags: ['lead'],
          categoriaId: 'uuid-da-categoria'
        },
        response: {
          success: true,
          data: {
            id: 'novo-uuid',
            nome: 'Maria Silva',
            telefone: '5511888888888',
            tags: ['lead']
          }
        }
      }
    ]
  },
  campaigns: {
    title: 'Campanhas e Disparos',
    endpoints: [
      {
        method: 'POST',
        path: '/api/campaigns',
        description: 'Cria e inicia uma nova campanha de disparo em massa.',
        requestBody: {
          nome: 'Campanha de Promoção',
          mensagem: 'Olá {nome}, confira nossa nova promoção!',
          connectionId: 'uuid-da-conexao-whatsapp',
          contatos: ['uuid-contato-1', 'uuid-contato-2']
        },
        response: {
          success: true,
          data: {
            id: 'uuid-da-campanha',
            nome: 'Campanha de Promoção',
            status: 'PENDING'
          }
        }
      }
    ]
  },
  webhooks: {
    title: 'Webhooks',
    description: 'Você pode receber notificações em tempo real através de Webhooks e fluxos como o n8n ou Typebot, ou configurar retornos de gateways de pagamento.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/webhooks/incoming/:webhookId',
        description: 'Recebe dados de fontes externas (como formulários, Typebot) para salvar leads diretamente no sistema.',
        requestBody: {
          nome: 'Lead Externo',
          telefone: '5511977777777',
          tags: ['origem_typebot']
        }
      },
      {
        method: 'POST',
        path: '/api/webhooks/syncpay',
        description: 'URL de Webhook oficial para configurar na plataforma SyncPay. Recebe automaticamente o status de pagamentos de assinaturas via Pix e libera/renova o acesso dos Tenants (clientes) em tempo real.',
        requestBody: {
          event: 'transaction.updated',
          data: {
            id: 'syncpay_tx_123456',
            status: 'PAID',
            amount: 97.00
          }
        },
        response: {
          success: true,
          message: 'OK'
        }
      }
    ]
  },
  whatsapp: {
    title: 'Conexões WhatsApp',
    endpoints: [
      {
        method: 'GET',
        path: '/api/waha/sessions',
        description: 'Lista todas as sessões (instâncias) do WhatsApp ativas no momento e seus status.',
        response: {
          success: true,
          data: [
            {
              id: 'uuid-sessao',
              nome: 'Suporte Principal',
              status: 'CONNECTED',
              numero: '5511999999999'
            }
          ]
        }
      }
    ]
  }
};

export function SuperAdminApiDocsPage() {
  const [activeSection, setActiveSection] = useState<string>('auth');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const methodColors = {
    GET: 'bg-blue-100 text-blue-800 border-blue-200',
    POST: 'bg-green-100 text-green-800 border-green-200',
    PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    DELETE: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        title="Documentação da API" 
        subtitle="Referência de endpoints para integração (Swagger / Postman)" 
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {Object.entries(docsData).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === key 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {section.title}
                <span className="bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full text-xs">
                  {section.endpoints.length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-gray-200 pb-5">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                {docsData[activeSection].title}
              </h2>
              {docsData[activeSection].description && (
                <p className="mt-3 text-lg text-gray-500">
                  {docsData[activeSection].description}
                </p>
              )}
            </div>

            <div className="space-y-10">
              {docsData[activeSection].endpoints.map((endpoint, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded text-sm font-bold border ${methodColors[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-900">
                        {endpoint.path}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopy(endpoint.path)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      title="Copiar URL"
                    >
                      {copiedPath === endpoint.path ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Descrição</h4>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>

                    {endpoint.requestBody && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Exemplo de Requisição (Body JSON)</h4>
                        <div className="relative">
                          <pre className="bg-gray-900 rounded-md p-4 overflow-x-auto text-sm text-gray-100 font-mono">
                            {JSON.stringify(endpoint.requestBody, null, 2)}
                          </pre>
                          <button
                            onClick={() => handleCopy(JSON.stringify(endpoint.requestBody, null, 2))}
                            className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 focus:outline-none transition-colors"
                          >
                            Copiar JSON
                          </button>
                        </div>
                      </div>
                    )}

                    {endpoint.response && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Exemplo de Resposta de Sucesso</h4>
                        <div className="relative">
                          <pre className="bg-gray-800 rounded-md p-4 overflow-x-auto text-sm text-gray-100 font-mono border border-gray-700">
                            {JSON.stringify(endpoint.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
