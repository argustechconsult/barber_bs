'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInviteDetails, acceptInvite } from '../../actions/auth.actions';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    name: string;
    email: string | null;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getInviteDetails(token)
      .then((data) => {
        if (data) {
          setUserData(data);
        }
      })
      .catch(() => setError('Erro ao verificar convite'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const result = await acceptInvite(token, password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      setError(result.message || 'Erro ao definir senha.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-amber-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!token || (!userData && !loading)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center text-neutral-400">
          <h1 className="text-2xl font-bold mb-2">Convite Inválido</h1>
          <p>O link acessado é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold text-white">
            Bem-vindo!
          </h1>
          <p className="text-neutral-500">
            Configure sua senha para acessar o painel.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] shadow-xl">
          {success ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Tudo Pronto!</h2>
                <p className="text-neutral-500">
                  Sua senha foi definida com sucesso.
                </p>
              </div>
              <p className="text-sm text-neutral-600">
                Redirecionando para o login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center pb-4 border-b border-neutral-800">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500 font-bold text-2xl">
                  {userData?.name.charAt(0)}
                </div>
                <h3 className="font-bold text-lg text-white">
                  {userData?.name}
                </h3>
                <p className="text-sm text-neutral-500">{userData?.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-amber-500/40 text-white placeholder-neutral-700 transition-all font-sans"
                    placeholder="••••••"
                  />
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"
                    size={18}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all active:scale-95"
              >
                Definir Senha e Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <InviteContent />
    </Suspense>
  );
}
