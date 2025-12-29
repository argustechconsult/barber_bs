
import React, { useState } from 'react';
import { User, UserPlan, UserRole } from '../types';
import { MOCK_USERS, MOCK_PRODUCTS } from '../constants';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  Users2, 
  ShoppingBag, 
  AlertCircle, 
  UserX, 
  CheckCircle2, 
  Phone,
  Search,
  Filter,
  Package,
  // Added User as UserIcon to fix the compilation error on line 268
  User as UserIcon
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

// Simulated status for demo purposes
const CUSTOMER_LIST = MOCK_USERS.filter(u => u.role === UserRole.CLIENTE).map(u => ({
  ...u,
  status: u.id === 'u2' ? 'DEBT' : (u.id === 'start' ? 'CHURN' : 'PAID'),
  lastRenewal: u.id === 'start' ? '60 dias atrás' : 'Hoje'
}));

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [listFilter, setListFilter] = useState<'ALL' | 'DEBT' | 'CHURN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const revenueData = [
    { name: 'Jan', value: 12000 },
    { name: 'Fev', value: 15000 },
    { name: 'Mar', value: 13000 },
    { name: 'Abr', value: 22000 },
    { name: 'Mai', value: 19000 },
    { name: 'Jun', value: 28000 },
  ];

  const totalMarketSales = 4250.00;
  const bestSeller = MOCK_PRODUCTS[0]; // Pomada Matte

  const clients = CUSTOMER_LIST;
  const startCount = clients.filter(u => u.plan === UserPlan.START).length;
  const premiumCount = clients.filter(u => u.plan === UserPlan.PREMIUM).length;
  const debtCount = clients.filter(u => u.status === 'DEBT').length;
  const churnCount = clients.filter(u => u.status === 'CHURN').length;

  const subscriberData = [
    { name: 'Start', value: startCount, color: '#404040' },
    { name: 'Premium', value: premiumCount, color: '#f59e0b' },
  ];

  const filteredList = clients.filter(u => {
    const matchesFilter = listFilter === 'ALL' || u.status === listFilter;
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.whatsapp || '').includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-16 md:pt-0">
        <div>
          <h2 className="text-3xl font-display font-bold">Painel Administrativo</h2>
          <p className="text-neutral-500">Comando central da Barbearia Stayler</p>
        </div>
      </header>

      {/* Primary Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingBag size={48} className="text-blue-500" />
          </div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Vendas Marketplace</p>
          <p className="text-2xl font-display font-bold mt-2">R$ {totalMarketSales.toFixed(2)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-400 font-bold">
            <Package size={12} />
            <span>Top: {bestSeller.name}</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users2 size={48} className="text-amber-500" />
          </div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Assinantes Ativos</p>
          <p className="text-2xl font-display font-bold mt-2">{clients.length}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-amber-500 font-bold">
            <span>{premiumCount} Premium • {startCount} Start</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Inadimplentes</p>
          <p className="text-2xl font-display font-bold mt-2">{debtCount}</p>
          <div className="mt-4 text-[10px] text-red-500 font-bold">
            <span>Ação necessária urgente</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <UserX size={48} className="text-neutral-500" />
          </div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Churn (60 dias)</p>
          <p className="text-2xl font-display font-bold mt-2">{churnCount}</p>
          <div className="mt-4 text-[10px] text-neutral-400 font-bold">
            <span>Sem renovação há 2 meses</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Marketplace Performance Chart */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Evolução de Faturamento</h3>
            <div className="flex bg-neutral-800 p-1 rounded-xl">
              <button className="px-3 py-1 text-[9px] font-bold uppercase bg-amber-500 text-black rounded-lg">Mês</button>
              <button className="px-3 py-1 text-[9px] font-bold uppercase text-neutral-500">Ano</button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '12px'}}
                  itemStyle={{color: '#f59e0b'}}
                />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Mix Chart */}
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold mb-4">Clientes por Plano</h3>
          <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriberData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subscriberData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-display font-bold">{clients.length}</span>
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Total</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Premium</span>
              </div>
              <span className="font-bold">{premiumCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-600"></div>
                <span>Start</span>
              </div>
              <span className="font-bold">{startCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Management List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="p-8 border-b border-neutral-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users2 className="text-amber-500" /> Gestão de Clientes
            </h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setListFilter('ALL')}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${listFilter === 'ALL' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setListFilter('DEBT')}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${listFilter === 'DEBT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
              >
                Inadimplentes
              </button>
              <button 
                onClick={() => setListFilter('CHURN')}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${listFilter === 'CHURN' ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
              >
                Churn (2 meses)
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar cliente por nome ou whatsapp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-amber-500/40 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/50">
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cliente</th>
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Contato</th>
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Plano</th>
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Última Renovação</th>
                <th className="p-6 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((client) => (
                <tr key={client.id} className="border-b border-neutral-800 hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-white/5">
                        <UserIcon size={20} className="text-neutral-500" />
                      </div>
                      <span className="font-bold">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <a href={`https://wa.me/${client.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-amber-500 transition-colors">
                      <Phone size={14} />
                      <span className="text-sm font-medium">{client.whatsapp || 'N/A'}</span>
                    </a>
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest border ${client.plan === UserPlan.PREMIUM ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' : 'border-neutral-700 text-neutral-500 bg-neutral-800'}`}>
                      {client.plan}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      {client.status === 'PAID' && <CheckCircle2 size={16} className="text-green-500" />}
                      {client.status === 'DEBT' && <AlertCircle size={16} className="text-red-500" />}
                      {client.status === 'CHURN' && <UserX size={16} className="text-neutral-500" />}
                      <span className={`text-xs font-bold ${client.status === 'PAID' ? 'text-green-500' : client.status === 'DEBT' ? 'text-red-500' : 'text-neutral-500'}`}>
                        {client.status === 'PAID' ? 'Em dia' : client.status === 'DEBT' ? 'Em atraso' : 'Cancelado'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs text-neutral-400 font-medium">{client.lastRenewal}</span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:underline">Detalhes</button>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Users2 className="mx-auto text-neutral-800 mb-4" size={48} />
                    <p className="text-neutral-500 font-medium">Nenhum cliente encontrado com estes critérios.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
