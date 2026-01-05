'use client';
import React, { useState, useTransition } from 'react';
import { Scissors } from 'lucide-react';
import { signup } from '../actions/auth.actions';

import { User } from '../types';

interface SignUpProps {
  onRegister: (user: User) => void;
  onBackToLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onRegister, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('whatsapp', whatsapp);
      formData.append('birthDate', birthDate);

      try {
        const result = await signup(null, formData);
        if (result.success && result.user) {
          onRegister(result.user);
        } else {
          setError(result.message || 'Erro ao criar conta');
        }
      } catch (err) {
        setError('Erro inesperado. Tente novamente.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-start md:items-center justify-center p-2 pt-12 md:p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md space-y-6 md:space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-3xl mb-3 md:mb-4 rotate-3 shadow-2xl shadow-amber-500/20">
            <Scissors className="text-black w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tighter">
            STAYLER
          </h1>
          <p className="text-neutral-500 mt-2 text-sm tracking-widest uppercase">
            Crie sua conta
          </p>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Whatsapp
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 11) v = v.substring(0, 11);
                  if (v.length > 2)
                    v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                  if (v.length > 9)
                    v = `${v.substring(0, 10)}-${v.substring(10)}`;
                  setWhatsapp(v);
                }}
                placeholder="(00) 00000-0000"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Data de Nascimento
              </label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 8) v = v.substring(0, 8);
                  if (v.length > 2)
                    v = v.substring(0, 2) + '/' + v.substring(2);
                  if (v.length > 5)
                    v = v.substring(0, 5) + '/' + v.substring(5);
                  setBirthDate(v);
                }}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-neutral-600"
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
                placeholder="Crie uma senha segura"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transform transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Criando Conta...' : 'Criar Conta'}
            </button>
          </form>

          <div className="flex justify-center w-full text-amber-500 text-sm font-bold mt-1 hover:underline">
            <button
              onClick={onBackToLogin}
              className="text-white py-2 text-center"
            >
              <span className="text-white">Já tem conta? Faça Login</span>
            </button>
          </div>
        </div>

        <div className="pt-1 mt-6 md:mt-12 text-center">
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

export default SignUp;
