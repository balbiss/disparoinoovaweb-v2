import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export function SignupPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [publicSettings, setPublicSettings] = useState<{ logoUrl?: string; companyName?: string } | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(d => setPublicSettings(d))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/checkout/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTransaction(data.transaction);
        setStep(2);
        toast.success('Empresa criada! Efetue o pagamento para ativar o acesso.');
      } else {
        toast.error(data.error || data.message || 'Erro ao criar conta');
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.pixCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && transaction) {
      interval = setInterval(async () => {
        try {
          const r = await fetch(`/api/checkout/status/${transaction.txId}`);
          const d = await r.json();
          if (['PAID', 'APPROVED', 'completed'].includes(d.status)) {
            setPaymentStatus('PAID');
            clearInterval(interval);
            toast.success('Pagamento aprovado!');
            setTimeout(() => navigate('/login'), 3000);
          } else if (['CANCELED', 'REJECTED', 'failed'].includes(d.status)) {
            setPaymentStatus('CANCELED');
            clearInterval(interval);
          }
        } catch {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [step, transaction, navigate]);

  const logoUrl = publicSettings?.logoUrl;
  const companyName = publicSettings?.companyName || 'Sistema';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Inter', 'Segoe UI', sans-serif; }

        .signup-page {
          min-height: 100vh;
          background: linear-gradient(150deg, #f0f4ff 0%, #fafaff 60%, #f5f0ff 100%);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2rem 1rem 3rem;
        }

        .signup-wrapper {
          width: 100%;
          max-width: 440px;
        }

        /* Header */
        .signup-header {
          text-align: center;
          margin-bottom: 0.625rem;
        }
        .logo-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 96px; height: 96px;
          border-radius: 20px;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }
        .logo-box.has-logo {
          background: transparent;
          box-shadow: none;
          border-radius: 0;
        }
        .logo-box.no-logo {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 8px 24px rgba(99,102,241,0.35);
        }
        .logo-img { width: 100%; height: 100%; object-fit: contain; border-radius: 14px; }
        .signup-title {
          font-size: clamp(1.25rem, 4vw, 1.5rem);
          font-weight: 800;
          color: #1e1b4b;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .signup-subtitle {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        /* Steps */
        .steps-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .step-bubble {
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700;
          transition: all 0.3s;
        }
        .step-bubble.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 12px rgba(99,102,241,0.35);
        }
        .step-bubble.inactive {
          background: #e5e7eb;
          color: #9ca3af;
        }
        .step-line {
          flex: 0 0 60px; height: 2px; border-radius: 1px;
          transition: all 0.3s;
        }
        .step-line.active { background: linear-gradient(90deg, #6366f1, #8b5cf6); }
        .step-line.inactive { background: #e5e7eb; }

        /* Card */
        .signup-card {
          background: white;
          border-radius: 1.5rem;
          box-shadow: 0 4px 40px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.05);
          padding: clamp(1.25rem, 5vw, 2rem);
          border: 1px solid rgba(99,102,241,0.1);
        }

        /* Form */
        .form-inner { display: flex; flex-direction: column; gap: 1rem; }

        .field-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.375rem;
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 0.875rem; top: 50%;
          transform: translateY(-50%);
          color: #9ca3af; pointer-events: none;
          display: flex; align-items: center;
        }
        .field-input {
          width: 100%;
          padding: 0.75rem 0.875rem 0.75rem 2.625rem;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.75rem;
          color: #111827;
          font-size: 0.9375rem;
          font-family: inherit;
          outline: none;
          transition: all 0.15s ease;
        }
        .field-input:focus {
          background: #fafaff;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .field-input::placeholder { color: #d1d5db; }

        /* Submit button */
        .btn-submit {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 0.875rem;
          color: white;
          font-weight: 700;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .btn-submit:disabled {
          background: #c4b5fd;
          box-shadow: none;
          cursor: not-allowed;
        }
        .btn-submit:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.5);
        }

        .login-link {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .login-link button {
          background: none; border: none;
          color: #6366f1; cursor: pointer;
          font-weight: 600; font-size: inherit;
          font-family: inherit;
        }

        /* Payment step */
        .payment-inner {
          display: flex; flex-direction: column;
          align-items: center; gap: 1.25rem;
        }

        .amount-box {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #86efac;
          border-radius: 1rem;
          padding: 0.875rem 1.5rem;
          text-align: center;
          width: 100%;
        }
        .amount-label {
          font-size: 0.75rem; font-weight: 600;
          color: #16a34a; text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 0.25rem;
        }
        .amount-value {
          font-size: clamp(1.625rem, 6vw, 2rem);
          font-weight: 900; color: #15803d;
          letter-spacing: -0.03em;
        }
        .amount-sub {
          font-size: 0.75rem; color: #4ade80; margin-top: 0.2rem;
        }

        .qr-wrap {
          background: white;
          padding: 1rem; border-radius: 1.25rem;
          box-shadow: 0 0 0 1px #e5e7eb, 0 6px 20px rgba(0,0,0,0.07);
          display: inline-flex;
        }

        .qr-hint {
          font-size: 0.8125rem; color: #6b7280;
          text-align: center; line-height: 1.5;
        }

        .copy-area { width: 100%; }
        .copy-label {
          font-size: 0.8125rem; font-weight: 600;
          color: #374151; margin-bottom: 0.5rem;
        }
        .copy-row {
          display: flex; gap: 0.5rem; align-items: stretch;
        }
        .copy-code {
          flex: 1; padding: 0.625rem 0.875rem;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 0.625rem;
          font-size: 0.75rem; color: #6b7280;
          overflow: hidden; white-space: nowrap;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .btn-copy {
          padding: 0 1rem;
          border: none; border-radius: 0.625rem;
          font-weight: 700; font-size: 0.8125rem;
          font-family: inherit;
          cursor: pointer; white-space: nowrap;
          transition: all 0.2s; flex-shrink: 0;
        }
        .btn-copy.idle {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }
        .btn-copy.done {
          background: #dcfce7; color: #16a34a;
        }

        .waiting-box {
          display: flex; align-items: center; gap: 0.75rem;
          background: #eff6ff; border: 1px solid #bfdbfe;
          border-radius: 0.875rem; padding: 0.875rem 1rem;
          width: 100%;
        }
        .waiting-text-main {
          font-size: 0.8125rem; font-weight: 600; color: #1d4ed8;
        }
        .waiting-text-sub {
          font-size: 0.75rem; color: #3b82f6; margin-top: 0.125rem;
        }

        .btn-back {
          background: none; border: none;
          color: #9ca3af; cursor: pointer;
          font-size: 0.8125rem; font-family: inherit;
        }

        /* Paid / Canceled states */
        .state-icon {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
        }
        .state-icon.success {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 8px 24px rgba(34,197,94,0.35);
        }
        .state-icon.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 8px 24px rgba(239,68,68,0.3);
        }
        .state-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center; }
        .state-title.success { color: #15803d; }
        .state-title.error { color: #dc2626; }
        .state-sub { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; text-align: center; }

        .btn-retry {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; border-radius: 0.75rem;
          color: white; font-weight: 700; cursor: pointer;
          font-size: 0.9rem; font-family: inherit;
          box-shadow: 0 4px 12px rgba(99,102,241,0.35);
          display: block; margin: 0 auto;
        }

        .signup-footer {
          text-align: center; margin-top: 1.25rem;
          font-size: 0.75rem; color: #9ca3af;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1.2s linear infinite; }

        /* Mobile tweaks */
        @media (max-width: 480px) {
          .signup-page { padding: 1.25rem 0.75rem 2rem; }
          .logo-box { width: 54px; height: 54px; border-radius: 14px; }
          .qr-wrap { padding: 0.75rem; }
        }
      `}</style>

      <div className="signup-page">
        <div className="signup-wrapper">

          {/* Header */}
          <div className="signup-header">
            <div className={`logo-box ${logoUrl ? 'has-logo' : 'no-logo'}`}>
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '30px', height: '30px' }} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </div>
            <h1 className="signup-title">
              {step === 1 ? 'Criar sua Empresa' : 'Finalizar Pagamento'}
            </h1>
            <p className="signup-subtitle">
              {step === 1
                ? `Crie sua conta no ${companyName} agora`
                : 'Escaneie o QR Code para ativar sua conta'}
            </p>
          </div>

          {/* Steps */}
          <div className="steps-row">
            <div className={`step-bubble ${step >= 1 ? 'active' : 'inactive'}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : 'inactive'}`} />
            <div className={`step-bubble ${step >= 2 ? 'active' : 'inactive'}`}>2</div>
          </div>

          {/* Card */}
          <div className="signup-card">

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handleSubmit} className="form-inner">

                <Field label="Nome da Empresa" name="companyName" placeholder="Ex: Minha Empresa Ltda" value={formData.companyName} onChange={handleChange} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                } />

                <Field label="Seu Nome Completo" name="userName" placeholder="João da Silva" value={formData.userName} onChange={handleChange} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                } />

                <Field label="E-mail" name="email" type="email" placeholder="joao@empresa.com" value={formData.email} onChange={handleChange} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                } />

                <Field label="Senha" name="password" type="password" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleChange} icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                } />

                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? (
                    <>
                      <svg className="spin" style={{ width: '18px', height: '18px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Criando conta...
                    </>
                  ) : 'Continuar para Pagamento'}
                </button>

                <p className="login-link">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => navigate('/login')}>Faça login</button>
                </p>
              </form>
            )}

            {/* STEP 2 */}
            {step === 2 && transaction && (
              <div className="payment-inner">

                {paymentStatus === 'PENDING' && (
                  <>
                    <div className="amount-box">
                      <p className="amount-label">Valor a Pagar</p>
                      <p className="amount-value">
                        R$ {transaction.amount?.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="amount-sub">Assinatura mensal · Pix</p>
                    </div>

                    <div className="qr-wrap">
                      <QRCodeSVG value={transaction.pixCode} size={180} />
                    </div>

                    <p className="qr-hint">
                      Abra o app do seu banco → <strong>Pix</strong> → <strong>Ler QR Code</strong>
                    </p>

                    <div className="copy-area">
                      <p className="copy-label">Pix Copia e Cola</p>
                      <div className="copy-row">
                        <div className="copy-code">{transaction.pixCode}</div>
                        <button
                          onClick={handleCopy}
                          className={`btn-copy ${copied ? 'done' : 'idle'}`}
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    <div className="waiting-box">
                      <svg className="spin" style={{ width: '20px', height: '20px', color: '#3b82f6', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <div>
                        <p className="waiting-text-main">Aguardando confirmação...</p>
                        <p className="waiting-text-sub">A tela atualiza automaticamente após o pagamento</p>
                      </div>
                    </div>

                    <button className="btn-back" onClick={() => setStep(1)}>
                      ← Voltar ao cadastro
                    </button>
                  </>
                )}

                {paymentStatus === 'PAID' && (
                  <div style={{ width: '100%', textAlign: 'center', padding: '1.5rem 0' }}>
                    <div className="state-icon success">
                      <svg style={{ width: '36px', height: '36px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="state-title success">Pagamento Confirmado!</p>
                    <p className="state-sub">Sua empresa está ativa. Redirecionando para o login...</p>
                  </div>
                )}

                {paymentStatus === 'CANCELED' && (
                  <div style={{ width: '100%', padding: '1.5rem 0' }}>
                    <div className="state-icon error">
                      <svg style={{ width: '36px', height: '36px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="state-title error">Pagamento Expirado</p>
                    <p className="state-sub">O tempo para pagamento expirou. Tente novamente.</p>
                    <button className="btn-retry" onClick={() => { setStep(1); setPaymentStatus('PENDING'); setTransaction(null); }}>
                      Tentar novamente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="signup-footer">
            Seus dados estão protegidos com criptografia SSL
          </p>
        </div>
      </div>
    </>
  );
}

function Field({ label, name, type = 'text', placeholder, value, onChange, icon }: {
  label: string; name: string; type?: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field-wrap">
        <span className="field-icon">{icon}</span>
        <input
          name={name}
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="field-input"
        />
      </div>
    </div>
  );
}
