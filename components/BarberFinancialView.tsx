import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Receipt,
  ShoppingBag,
  X,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface BarberFinancialViewProps {
  user: User;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'SUBSCRIPTION' | 'APPOINTMENT';
  date: string;
}

const BarberFinancialView: React.FC<BarberFinancialViewProps> = ({ user }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const [financialStats, setFinancialStats] = useState({
    transactions: [] as Transaction[],
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    marketSales: 0,
  });

  const fetchStats = () => {
    import('../actions/users/barber.actions').then(({ getFinancialStats }) => {
      const barberId = isAdmin ? undefined : user.id;
      getFinancialStats(barberId).then((res) => {
        if (res.success && res.stats) {
          setFinancialStats({
            transactions: res.stats.transactions.map((t: any) => ({
              id: t.id,
              description: t.description || 'Sem descrição',
              amount: t.amount,
              type: t.type as any,
              date: t.date,
            })),
            totalIncome: res.stats.totalIncome,
            totalExpense: res.stats.totalExpense,
            netProfit: res.stats.netProfit,
            marketSales: res.stats.marketSales,
          } as any);
        }
      });
    });
  };

  React.useEffect(() => {
    fetchStats();
  }, [user]);

  // Historical Transactions
  const displayedTransactions = financialStats.transactions;

  const stats = [
    {
      label: isAdmin ? 'Receita Total' : 'Meus Ganhos (Mês)',
      value: `R$ ${financialStats.totalIncome.toFixed(2)}`,
      icon: isAdmin ? ArrowUpCircle : DollarSign,
      color: 'text-green-500',
    },
    ...(isAdmin
      ? [
          {
            label: 'Despesas',
            value: `R$ ${financialStats.totalExpense.toFixed(2)}`,
            icon: ArrowDownCircle,
            color: 'text-red-500',
          },
          {
            label: 'Lucro Líquido',
            value: `R$ ${financialStats.netProfit.toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-amber-500',
          },
          {
            label: 'Vendas Market',
            value: `R$ ${(financialStats as any).marketSales?.toFixed(2) || '0.00'}`,
            icon: ShoppingBag,
            color: 'text-blue-500',
          },
        ]
      : []),
  ];

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = formData.get('desc') as string;
    const amount = Number(formData.get('amount'));

    if (user.id) {
      const { createTransaction } =
        await import('../actions/users/barber.actions');
      const res = await createTransaction({
        description,
        amount,
        type: transType,
        userId: user.id,
      });

      if (res.success) {
        fetchStats(); // Refresh data
        setShowAddTransaction(false);
      } else {
        alert('Erro ao criar transação');
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      const { deleteTransaction } =
        await import('../actions/users/barber.actions');
      const res = await deleteTransaction(id);

      if (res.success) {
        fetchStats();
      } else {
        alert('Erro ao excluir transação');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Barber Profile Header */}
      {user.barbeiroId && (
        <div className="flex flex-col items-center justify-center pt-4 pb-4 space-y-3">
          {user.barbeiroId && (
            <div className="flex flex-col items-center justify-center pt-4 pb-4 space-y-3">
              <div className="w-32 h-32 rounded-full border-4 border-amber-500 p-1">
                <img
                  src={user.image || '/default.jpeg'}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">
                {user.name}
              </h2>
            </div>
          )}
        </div>
      )}
      <header className="flex flex-col items-center text-center gap-6 pt-4 md:pt-0">
        <div>
          <h2 className="text-xl md:text-3xl font-display font-bold">
            Financeiro
          </h2>
          <p className="text-neutral-500 text-sm">
            {isAdmin
              ? 'Gestão de caixa da barbearia'
              : 'Suas receitas e rendimentos'}
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {isAdmin && (
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex-1 md:flex-none bg-amber-500 text-black px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10"
            >
              <Plus size={20} /> Novo Lançamento
            </button>
          )}
          <button
            onClick={() => fetchStats()}
            className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-all text-neutral-400 hover:text-white"
            title="Atualizar dados"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div
        className={`grid gap-4 ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-1'}`}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-neutral-900 border border-neutral-800 p-4 md:p-6 rounded-3xl"
          >
            <s.icon
              className={`${s.color} mb-3 md:mb-4 w-5 h-5 md:w-6 md:h-6`}
            />
            <p className="text-neutral-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
              {s.label}
            </p>
            <p className="text-xl md:text-2xl font-display font-bold mt-0.5 md:mt-1">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="text-amber-500" />{' '}
            <span className="text-lg md:text-xl">
              {isAdmin ? 'Últimas Transações' : 'Suas Receitas'}
            </span>
          </h3>

          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-2">
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 md:p-4 hover:bg-white/5 transition-colors border-b border-neutral-800 last:border-0 rounded-2xl group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 md:p-3 rounded-xl ${
                          t.type === 'EXPENSE'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        {t.type === 'EXPENSE' ? (
                          <ArrowDownCircle
                            size={18}
                            className="md:w-5 md:h-5"
                          />
                        ) : (
                          <ArrowUpCircle size={18} className="md:w-5 md:h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{t.description}</p>
                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                          {t.date} •{' '}
                          {t.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`font-bold text-base md:text-lg ${
                          t.type === 'EXPENSE'
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {t.type === 'EXPENSE' ? '-' : '+'} R${' '}
                        {t.amount.toFixed(2)}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-2 text-neutral-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-neutral-500 italic">
                  Nenhum registro encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {isAdmin && (
            <>
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-6">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  <ShoppingBag className="text-amber-500" size={18} />{' '}
                  Marketplace Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Lucro Bruto Market</span>
                    <span className="font-bold text-green-500">
                      R${' '}
                      {(financialStats as any).marketSales?.toFixed(2) ||
                        '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Taxa de Margem</span>
                    <span className="font-bold">20%</span>
                  </div>
                  <div className="h-[1px] bg-neutral-800 my-2"></div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest text-center italic">
                    Marketplace Ativo
                  </p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-4">
                <Calendar className="text-blue-500 w-8 h-8" />
                <h4 className="font-bold">Próximo Fechamento</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  O fechamento detalhado do caixa quinzenal ocorre em 4 dias.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Transaction Modal (Admin Only) */}
      {showAddTransaction && isAdmin && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">
                Lançamento Financeiro
              </h3>
              <button
                onClick={() => setShowAddTransaction(false)}
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="flex p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setTransType('INCOME')}
                  className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-widest transition-all ${
                    transType === 'INCOME'
                      ? 'bg-amber-500 text-black'
                      : 'text-neutral-500'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setTransType('EXPENSE')}
                  className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-widest transition-all ${
                    transType === 'EXPENSE'
                      ? 'bg-amber-500 text-black'
                      : 'text-neutral-500'
                  }`}
                >
                  Despesa
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                    Descrição
                  </label>
                  <input
                    required
                    name="desc"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                    placeholder="Ex: Pagamento de Fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                    Valor (R$)
                  </label>
                  <input
                    required
                    name="amount"
                    type="number"
                    step="0.01"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 active:scale-95 transition-transform"
              >
                Confirmar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberFinancialView;
