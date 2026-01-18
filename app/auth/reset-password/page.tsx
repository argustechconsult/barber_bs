'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import NewPasswordScreen from '../../../src/modules/auth/NewPasswordScreen';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div>
      {!token ? (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-white text-center">
            <h1 className="text-2xl font-bold mb-4">Link Inválido</h1>
            <p className="text-neutral-400 mb-6">
              Este link de recuperação parece estar incompleto ou expirado.
            </p>
            <a
              href="/"
              className="bg-amber-500 text-black px-6 py-2 rounded-xl font-bold"
            >
              Voltar ao Início
            </a>
          </div>
        </div>
      ) : (
        <NewPasswordScreen token={token} />
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
