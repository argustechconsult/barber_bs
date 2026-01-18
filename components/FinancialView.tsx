import React, { useState, useEffect } from 'react';
import { User, UserPlan } from '../types';
import {
  Download,
  CheckCircle,
  Clock,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialViewProps {
  user: User;
}

const FinancialView: React.FC<FinancialViewProps> = ({ user }) => {
  const isPremium = user.plan === UserPlan.PREMIUM;
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (isPremium) {
      import('../actions/users/barber.actions').then(
        ({ getFinancialStats }) => {
          getFinancialStats(user.id).then((res) => {
            if (res.success && res.stats?.transactions) {
              // Filter only subscription payments
              const subs = res.stats.transactions.filter(
                (t: any) =>
                  t.type === 'SUBSCRIPTION' ||
                  t.description.toLowerCase().includes('mensalidade'),
              );
              setInvoices(subs);
            }
          });
        },
      );
    }
  }, [user.id, isPremium]);

  // Calculate next renewal based on lastRenewal or default to next month
  // Assuming lastRenewal is stored as string 'YYYY-MM-DD' or similar in user object
  // If not present, maybe default to today + 30 days or handle gracefully
  const lastRenewalDate = user.lastRenewal
    ? parseISO(user.lastRenewal)
    : new Date();
  const nextRenewalDate = addMonths(lastRenewalDate, 1);

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="text-center pt-4">
        <h2 className="text-3xl font-display font-bold">Financeiro</h2>
        <p className="text-neutral-500 mt-2">Seus planos e faturas</p>
      </header>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div
          className={`p-8 ${
            isPremium ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-white'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  isPremium ? 'text-black/60' : 'text-neutral-400'
                }`}
              >
                Plano Atual
              </p>
              <h3 className="text-3xl font-display font-bold">
                {isPremium ? 'Premium Mensalista' : 'Start'}
              </h3>
            </div>
            <div
              className={`p-3 rounded-2xl ${
                isPremium ? 'bg-black/10' : 'bg-neutral-900'
              }`}
            >
              <ShieldCheck size={24} />
            </div>
          </div>
          <p
            className={`text-sm font-medium ${
              isPremium ? 'text-black/80' : 'text-neutral-400'
            }`}
          >
            {isPremium
              ? 'Acesso total ilimitado de Segunda a Sexta'
              : 'Pagamento por serviço individual'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {isPremium ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Próxima Renovação
                    </p>
                    <p className="text-sm font-bold">
                      {format(nextRenewalDate, "d 'de' MMMM, yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-amber-500 font-bold">R$ 150</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Minhas Faturas
                </h4>
                <div className="space-y-3">
                  {invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-800 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <ReceiptText className="text-neutral-400" size={18} />
                          <div>
                            <p className="text-sm font-bold">
                              {invoice.description || 'Mensalidade'}
                            </p>
                            <p className="text-[10px] text-neutral-500">
                              Pago em{' '}
                              {format(parseISO(invoice.date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => alert('Baixando fatura...')}
                          className="p-2 bg-amber-500 text-black rounded-xl hover:scale-105 transition-transform"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      Nenhuma fatura encontrada.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem]">
                <Clock className="text-amber-500 mx-auto mb-4" size={32} />
                <h4 className="font-bold text-lg mb-2">
                  Ainda não é mensalista?
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  No plano Start você paga apenas pelo que consome. Migre para o
                  Premium e tenha cortes ilimitados todo mês!
                </p>
              </div>
              <button className="w-full bg-amber-500 text-black font-bold py-4 rounded-3xl shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2">
                Ver Planos Premium <CheckCircle size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialView;
