import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export function RenewSubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const navigate = useNavigate();

  const handleRenew = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // No auth token? Redirecionar para login.
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/checkout/renew', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTransaction(data.transaction);
        toast.success('Fatura gerada! Efetue o pagamento para renovar o acesso.');
      } else {
        toast.error(data.message || 'Erro ao gerar fatura de renovação');
      }
    } catch (error) {
      console.error('Renew error:', error);
      toast.error('Erro de conexão ao gerar fatura');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (transaction) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/checkout/status/${transaction.txId}`);
          const data = await response.json();
          if (data.status === 'PAID' || data.status === 'APPROVED') {
            setPaymentStatus('PAID');
            clearInterval(interval);
            toast.success('Pagamento aprovado! Sua assinatura foi renovada.');
            setTimeout(() => {
              navigate('/');
            }, 3000);
          } else if (data.status === 'CANCELED' || data.status === 'REJECTED') {
            setPaymentStatus('CANCELED');
            clearInterval(interval);
            toast.error('Pagamento cancelado ou rejeitado.');
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [transaction, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Renovar Assinatura
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sua assinatura expirou. Realize o pagamento para continuar acessando o sistema.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!transaction ? (
            <div className="text-center space-y-6">
              <button
                onClick={handleRenew}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Processando...' : 'Gerar Fatura (Pix)'}
              </button>
              <div>
                <button
                  onClick={() => {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    navigate('/login');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              {paymentStatus === 'PENDING' && (
                <>
                  <p className="text-center text-gray-600">
                    Escaneie o QR Code abaixo com o aplicativo do seu banco para pagar R$ {transaction.amount.toFixed(2).replace('.', ',')}.
                  </p>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <QRCodeSVG value={transaction.pixCode} size={200} />
                  </div>
                  <div className="w-full">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Pix Copia e Cola:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={transaction.pixCode}
                        className="w-full text-xs p-2 border rounded bg-gray-50 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(transaction.pixCode);
                          toast.success('Código copiado!');
                        }}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-blue-600 text-sm mt-4">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Aguardando confirmação do pagamento...
                  </div>
                </>
              )}
              {paymentStatus === 'PAID' && (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Pagamento Confirmado!</h3>
                  <p className="text-sm text-gray-500">Redirecionando...</p>
                </div>
              )}
              {paymentStatus === 'CANCELED' && (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Pagamento Expirado ou Cancelado</h3>
                  <button
                    onClick={() => setTransaction(null)}
                    className="mt-4 text-blue-600 hover:text-blue-500"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
