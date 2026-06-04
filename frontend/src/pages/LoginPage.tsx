import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { settings } = useGlobalSettings();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.senha);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo (Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-secondary/10 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }}></div>

      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden relative z-10 mx-4">
        <div className="flex flex-col md:flex-row min-h-[400px]">
          {/* Lado Esquerdo - Branding */}
          <div className="md:w-1/2 p-6 flex flex-col items-center justify-center relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
            
            {/* Decorações do painel escuro */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl"></div>

            <div className="text-center relative z-10 flex flex-col items-center w-full max-w-sm">
              <style>{`
                @keyframes float-premium {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-12px); }
                  100% { transform: translateY(0px); }
                }
                .animate-float-premium {
                  animation: float-premium 6s ease-in-out infinite;
                }
              `}</style>
              
              <div className="w-full mb-10 flex items-center justify-center h-40">
                <img
                  src={settings?.logoUrl || '/assets/default-logo.png'}
                  alt={settings?.companyName || 'Sistema'}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] animate-float-premium"
                />
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-sm text-center">
                {settings?.pageTitle || 'Astra Online'}
              </h1>
              
              <div className="w-16 h-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full mb-6 opacity-80"></div>
              
              <p className="text-lg font-medium text-gray-300 mb-2 text-center">
                {settings?.companyName || 'Sistema de Gestão de Campanhas'}
              </p>
              
              <p className="text-sm text-gray-400/80 max-w-xs leading-relaxed">
                Gerencie seus contatos e campanhas de WhatsApp de forma eficiente, rápida e escalável.
              </p>
            </div>
          </div>

          {/* Lado Direito - Formulário */}
          <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-center bg-white">
            <div className="w-full max-w-sm mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-1 tracking-tight">Bem-vindo de volta!</h2>
                <p className="text-xs text-slate-500 font-medium">Faça login para acessar o painel de controle.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:border-brand-primary/50 outline-none transition-all duration-200 text-slate-700 font-medium placeholder:font-normal placeholder:text-slate-400 shadow-sm"
                      style={{ '--tw-ring-color': 'var(--color-brand-primary, #1e293b)' } as React.CSSProperties}
                      placeholder="seu@email.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm font-medium text-red-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="senha" className="block text-sm font-semibold text-slate-700">
                      Senha
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      {...register('senha')}
                      type="password"
                      id="senha"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:border-brand-primary/50 outline-none transition-all duration-200 text-slate-700 font-medium placeholder:font-normal placeholder:text-slate-400 shadow-sm"
                      style={{ '--tw-ring-color': 'var(--color-brand-primary, #1e293b)' } as React.CSSProperties}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.senha && (
                    <p className="mt-2 text-sm font-medium text-red-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                      {errors.senha.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full text-white py-3.5 px-6 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_25px_-6px_rgba(0,0,0,0.4)] transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(to right, #1e293b, #0f172a)',
                    '--tw-ring-color': '#1e293b'
                  } as React.CSSProperties}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar no Painel
                      <svg className="w-5 h-5 ml-2 -mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                  Protegido com criptografia de ponta a ponta
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}