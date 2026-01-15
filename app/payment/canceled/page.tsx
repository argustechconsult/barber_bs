'use client';

import Link from 'next/link';
import { XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function PaymentCanceledPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full"></div>
          <div className="relative bg-neutral-900 border border-red-500/30 p-6 rounded-[2.5rem]">
            <XCircle size={80} className="text-red-500 mx-auto" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-display font-black tracking-tight text-white">
            Pagamento Cancelado
          </h1>
          <p className="text-neutral-400 text-lg">
            O processo de pagamento não foi concluído.
          </p>
        </div>

        <div className="bg-neutral-900/50 p-6 rounded-3xl border border-white/5 flex items-start gap-4 text-left">
          <AlertCircle className="text-amber-500 shrink-0" size={24} />
          <p className="text-sm text-neutral-400">
            Se houve algum problema técnico ou se você desistiu da compra, não
            se preocupe. Seus dados estão salvos e você pode tentar novamente.
          </p>
        </div>

        <div className="pt-8">
          <Link
            href="/"
            className="group flex items-center justify-center gap-3 border border-neutral-800 hover:bg-neutral-900 text-white font-black py-4 px-8 rounded-full transition-all"
          >
            <ArrowLeft
              size={20}
              className="transition-transform group-hover:-translate-x-1"
            />
            <span>TENTAR NOVAMENTE</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
