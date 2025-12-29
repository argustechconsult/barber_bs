
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Plus, Receipt, ShoppingBag, X, Calendar } from 'lucide-react';

interface BarberFinancialViewProps {
  user: User;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

const BarberFinancialView: React.FC<BarberFinancialViewProps> = ({ user }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', description: 'Corte de Cabelo (PIX)', amount: 50, type: 'INCOME', date: '2024-06-12' },
    { id: '2', description: 'Pagamento de Aluguel', amount: 1500, type: 'EXPENSE', date: '2024-06-10' },
    { id: '3', description: 'Pomada Matte Venda', amount: 45, type: 'INCOME', date: '2024-06-12' },
    { id: '4', description: 'Energia Elétrica', amount: 320, type: 'EXPENSE', date: '2024-06-05' },
  ]);

  // Common barbers only see their incomes/receitas
  const displayedTransactions = isAdmin 
    ? transactions 
    : transactions.filter(t => t.type === 'INCOME');

  const stats = isAdmin ? [
    { label: 'Receita Total', value: `R$ ${transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}`, icon: ArrowUpCircle, color: 'text-green-500' },
    { label: 'Despesas', value: `R$ ${transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}`, icon: ArrowDownCircle, color: 'text-red-500' },
    { label: 'Lucro Líquido', value: `R$ ${(transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0) - transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)}`, icon: TrendingUp, color: 'text-amber-500' },
    { label: 'Vendas Market', value: 'R$ 1.800', icon: ShoppingBag, color: 'text-blue-500' },
  ] : [
    { label: 'Meus Ganhos (Mês)', value: 'R$ 3.200', icon: DollarSign, color: 'text-green-500' },
    { label: 'Comissões', value: 'R$ 640', icon: TrendingUp, color: 'text-amber-500' },
    { label: 'Atendimentos', value: '84', icon: Receipt, color: 'text-blue-500' },
    { label: 'Média p/ Corte', value: 'R$ 38', icon: DollarSign, color: 'text-neutral-500' },
  ];

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newT: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: formData.get('desc') as string,
      amount: Number(formData.get('amount')),
      type: transType,
      date: new Date().toISOString().split('T')[0]
    };
    setTransactions([newT, ...transactions]);
    setShowAddTransaction(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-16 md:pt-0">
        <div>
          <h2 className="text-3xl font-display font-bold">Financeiro</h2>
          <p className="text-neutral-500">{isAdmin ? 'Gestão de caixa da barbearia' : 'Suas receitas e rendimentos'}</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowAddTransaction(true)}
            className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10"
          >
            <Plus size={20} /> Novo Lançamento
          </button>
        )}
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
            <s.icon className={`${s.color} mb-4 w-6 h-6`} />
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="text-amber-500" /> {isAdmin ? 'Últimas Transações' : 'Suas Receitas'}
          </h3>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-2">
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-neutral-800 last:border-0 rounded-2xl group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${t.type === 'EXPENSE' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {t.type === 'EXPENSE' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                      </div>
                      <div>
                        <p className="font-bold">{t.description}</p>
                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                           {t.date} • {t.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`font-bold text-lg ${t.type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'}`}>
                        {t.type === 'EXPENSE' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                      </p>
                      {isAdmin && (
                        <button 
                          onClick={() => setTransactions(transactions.filter(item => item.id !== t.id))}
                          className="p-2 text-neutral-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                           <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-neutral-500 italic">Nenhum registro encontrado.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {isAdmin ? (
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-6">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <ShoppingBag className="text-amber-500" size={18} /> Marketplace Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Lucro Bruto Market</span>
                  <span className="font-bold text-green-500">+R$ 1.200</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Taxa de Margem</span>
                  <span className="font-bold">42%</span>
                </div>
                <div className="h-[1px] bg-neutral-800 my-2"></div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest text-center italic">Controle global ativo</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2.5rem] space-y-6">
               <div className="flex items-center gap-3">
                  <TrendingUp className="text-amber-500" />
                  <h4 className="font-bold">Meta do Mês</h4>
               </div>
               <p className="text-xs text-neutral-500 leading-relaxed">
                  Continue assim! Suas receitas de comissão subiram 10% em relação ao mesmo período do mês passado.
               </p>
            </div>
          )}
          
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-4">
             <Calendar className="text-blue-500 w-8 h-8" />
             <h4 className="font-bold">Próximo Fechamento</h4>
             <p className="text-xs text-neutral-500 leading-relaxed">O fechamento detalhado do caixa quinzenal ocorre em 4 dias.</p>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal (Admin Only) */}
      {showAddTransaction && isAdmin && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">Lançamento Financeiro</h3>
              <button onClick={() => setShowAddTransaction(false)} className="p-2 text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="flex p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
                <button 
                  type="button" 
                  onClick={() => setTransType('INCOME')}
                  className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-widest transition-all ${transType === 'INCOME' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}
                >
                  Receita
                </button>
                <button 
                  type="button" 
                  onClick={() => setTransType('EXPENSE')}
                  className={`flex-1 py-3 font-bold rounded-xl text-xs uppercase tracking-widest transition-all ${transType === 'EXPENSE' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}
                >
                  Despesa
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">Descrição</label>
                  <input required name="desc" className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40" placeholder="Ex: Pagamento de Fornecedor" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">Valor (R$)</label>
                  <input required name="amount" type="number" step="0.01" className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40" placeholder="0,00" />
                </div>
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 active:scale-95 transition-transform">
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
