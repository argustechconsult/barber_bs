'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  Scissors,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTransaction } from '../../../actions/marketplace/marketplace.actions';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const orderNsu = searchParams.get('order_nsu');

  const isSubscription = type === 'subscription';
  const isMarketplace = type === 'marketplace';

  const amountParam = searchParams.get('amount');
  const expirationDate = searchParams.get('expirationDate');

  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    if (isMarketplace && orderNsu) {
      getTransaction(orderNsu).then((res) => {
        if (res.success) {
          setTransaction(res.transaction);
        }
      });
    }
  }, [isMarketplace, orderNsu]);

  const formattedDate = expirationDate
    ? format(parseISO(expirationDate), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  const getTitle = () => {
    if (isSubscription) return 'Assinatura Ativa!';
    if (isMarketplace) return 'Pedido Confirmado!';
    return 'Pagamento Confirmado!';
  };

  const getSubtitle = () => {
    if (isSubscription)
      return 'Sua assinatura Premium foi processada com sucesso.';
    if (isMarketplace) return 'Sua compra foi realizada com sucesso.';
    return 'Seu agendamento foi garantido com sucesso.';
  };

  const getAmount = () => {
    if (isMarketplace && transaction) return transaction.amount;
    return amountParam;
  };

  const getDescription = () => {
    if (isMarketplace && transaction) {
      return transaction.description?.replace('Compra: ', '') || 'Produto';
    }
    return 'Garantido';
  };

  return (
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full"></div>
        <div className="relative bg-neutral-900 border border-amber-500/50 p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.2)]">
          <CheckCircle2
            size={80}
            className="text-amber-500 mx-auto animate-bounce"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          {getTitle()}
        </h1>
        <p className="text-neutral-400 text-lg">{getSubtitle()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900/50 p-4 rounded-3xl border border-white/5 space-y-2">
          {isMarketplace ? (
            <ShoppingBag size={24} className="text-amber-500 mx-auto" />
          ) : (
            <Calendar size={24} className="text-amber-500 mx-auto" />
          )}
          <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">
            {isSubscription ? 'Plano' : isMarketplace ? 'Produto' : 'Reserva'}
          </p>
          <p className="font-bold truncate">
            {isSubscription
              ? 'Premium'
              : isMarketplace
                ? transaction
                  ? transaction.description?.replace('Compra: ', '')
                  : '...'
                : 'Confirmada'}
          </p>
        </div>
        <div className="bg-neutral-900/50 p-4 rounded-3xl border border-white/5 space-y-2">
          <Scissors size={24} className="text-amber-500 mx-auto" />
          <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">
            {isSubscription
              ? 'Próxima Renovação'
              : isMarketplace
                ? 'Valor'
                : 'Serviço'}
          </p>
          <p className="font-bold">
            {isSubscription
              ? formattedDate || 'Mensal'
              : isMarketplace
                ? transaction
                  ? `R$ ${transaction.amount.toFixed(2)}`
                  : '...'
                : 'Garantido'}
          </p>
        </div>
      </div>

      {isSubscription && amountParam && (
        <div className="bg-amber-500/10 p-6 rounded-3xl border border-amber-500/20 text-center animate-in fade-in zoom-in duration-700">
          <p className="text-xs text-amber-500 uppercase font-black tracking-widest mb-1">
            Valor da Mensalidade
          </p>
          <p className="text-3xl font-display font-black text-white">
            R$ {amountParam}
          </p>
        </div>
      )}

      <div className="pt-8">
        <Link
          href={
            isSubscription ? '/?subscription_success=true' : '/?success=true'
          }
          className="group flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-black font-black py-4 px-8 rounded-full transition-all hover:scale-105 active:scale-95"
        >
          <span>VOLTAR PARA O INÍCIO</span>
          <ArrowRight
            size={20}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>

      <p className="text-neutral-600 text-sm">
        A confirmação também foi enviada para o seu WhatsApp.
      </p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-amber-500 animate-pulse">Carregando...</div>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
