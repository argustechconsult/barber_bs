'use client';
import React, { useState, useTransition } from 'react';
import { Scissors } from 'lucide-react';
import { login } from '../actions/auth.actions';

interface LoginProps {
  onLogin: (user: any) => void;
  onSignUpClick?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignUpClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBarberView, setIsBarberView] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      try {
        const result = await login(null, formData);
        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError(result.message || 'Erro ao fazer login');
        }
      } catch (err) {
        setError('Erro inesperado. Tente novamente.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 rounded-3xl mb-4 rotate-3 shadow-2xl shadow-amber-500/20">
            <Scissors className="text-black w-10 h-10" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tighter">
            STAYLER
          </h1>
          <p className="text-neutral-500 mt-2 text-sm tracking-widest uppercase">
            Estilo que permanece
          </p>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl p-8 rounded-3xl border border-neutral-800 shadow-2xl">
          <div className="flex bg-neutral-800 p-1 rounded-xl mb-8">
            <button
              onClick={() => setIsBarberView(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isBarberView ? 'bg-amber-500 text-black' : 'text-neutral-400'
              }`}
            >
              Sou Cliente
            </button>
            <button
              onClick={() => setIsBarberView(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isBarberView ? 'bg-amber-500 text-black' : 'text-neutral-400'
              }`}
            >
              Sou Barbeiro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Email / Usuário
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isBarberView ? 'Email corporativo' : 'Seu email'}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            {isBarberView && (
              <p className="text-[10px] text-amber-500/80 text-center italic mt-2">
                Acesso restrito. Barbeiros são cadastrados via admin.
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transform transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Entrando...' : 'Entrar na Barbearia'}
            </button>
          </form>

          {!isBarberView && (
            <div className="flex justify-center w-full text-amber-500 text-sm font-bold mt-1 hover:underline">
              <button
                onClick={() => onSignUpClick?.()}
                type="button"
                className="text-white py-2 text-center"
              >
                <span className="text-white">Crie uma conta</span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-1 mt-12 text-center">
          <p className="text-white text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} Barbearia Stayler. Todos os direitos
            reservados.
          </p>
          <a
            href="https://argustech.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-white hover:text-neutral-300 transition-colors py-2"
          >
            Produzido por
            <span className="font-bold text-white">Argus</span>
            <span className="font-bold" style={{ color: '#0000FF' }}>
              Tech
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
