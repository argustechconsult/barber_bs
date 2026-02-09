import React, { useState } from 'react';
import { User, UserPlan, UserRole } from '../types';
// import { MOCK_USERS, MOCK_PRODUCTS, MOCK_BARBERS } from '../constants'; // REMOVED
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  ShoppingBag,
  Eye,
  User as UserIcon,
  X,
  CheckCircle2,
  Scissors,
} from 'lucide-react';

interface BarberDashboardProps {
  user: User;
}

const BarberDashboard: React.FC<BarberDashboardProps> = ({ user }) => {
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [period, setPeriod] = useState<
    'monthly' | 'quarterly' | 'semiannual' | 'annual'
  >('monthly');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEBT' | 'CHURN'>(
    'ALL',
  );
  const [planFilter, setPlanFilter] = useState<'ALL' | 'START' | 'PREMIUM'>(
    'ALL',
  );

  const isAdmin = user.role === UserRole.ADMIN;
  // const clients = MOCK_USERS.filter((u) => u.role === UserRole.CLIENTE); // REMOVED
  const [clients, setClients] = useState<any[]>([]); // Real clients

  // const marketSales = 2450.0;
  // const bestSeller = MOCK_PRODUCTS[0]; // REMOVED
  const [bestSeller, setBestSeller] = useState<any>({
    name: 'Carregando...',
    image: '',
  });

  // const growthData = { ... removed ... };
  // const currentChartData = growthData[period];

  const [statsData, setStatsData] = useState({
    clientsServed: 0,
    totalRevenue: 0,
    averagePerDay: '0',
    cutsRevenue: 0,
    goalPercentage: 0,
    chartData: [] as any[], // Add chartData to state
  });

  const [adminStatsData, setAdminStatsData] = useState({
    cutsRevenue: 0,
    marketSales: 0,
    totalRevenue: 0,
    planStats: [] as { plan: string; count: number }[],
    totalClients: 0,
  });

  React.useEffect(() => {
    if (user.role === UserRole.BARBEIRO && user.id) {
      import('../actions/users/barber.actions').then(({ getBarberStats }) => {
        getBarberStats(user.id).then((res) => {
          if (res.success && res.stats) {
            setStatsData(res.stats);
          }
        });
      });
      // Barbers also need clients list for the modal
      import('../actions/users/user.actions').then(({ getClients }) => {
        getClients().then((fetchedClients) => {
          setClients(fetchedClients);
        });
      });
    } else if (user.role === UserRole.ADMIN) {
      // 1. Get Admin Stats
      import('../actions/users/barber.actions').then(({ getAdminStats }) => {
        getAdminStats().then((res) => {
          if (res.success && res.stats) {
            setAdminStatsData(res.stats);
          }
        });
      });
      // 2. Get Clients
      import('../actions/users/user.actions').then(({ getClients }) => {
        getClients().then((fetchedClients) => {
          setClients(fetchedClients);
        });
      });
      // 3. Get Best Seller
      import('../actions/marketplace/marketplace.actions').then(
        ({ getProducts }) => {
          getProducts().then((res) => {
            if (res.success && res.products.length > 0) {
              setBestSeller(res.products[0]);
            } else {
              setBestSeller({ name: 'Nenhum', image: '' });
            }
          });
        },
      );
    }
  }, [user]);

  // Recalculate plan counts from fetched data for Admin
  const startCount = isAdmin
    ? adminStatsData.planStats.find((p) => p.plan === UserPlan.START)?.count ||
      0
    : clients.filter((u) => u.plan === UserPlan.START).length;

  const premiumCount = isAdmin
    ? adminStatsData.planStats.find((p) => p.plan === UserPlan.PREMIUM)
        ?.count || 0
    : clients.filter((u) => u.plan === UserPlan.PREMIUM).length;

  const subscriberData = [
    { name: 'Start', value: startCount, fill: '#404040' },
    { name: 'Premium', value: premiumCount, fill: '#f59e0b' },
  ];

  // Specific stats for each role
  const stats = isAdmin
    ? [
        {
          label: 'Receita Cortes',
          value: `R$ ${adminStatsData.cutsRevenue.toFixed(2)}`,
          icon: Scissors,
          color: 'text-indigo-500',
        },
        {
          label: 'Vendas Market',
          value: `R$ ${adminStatsData.marketSales.toFixed(2)}`,
          icon: ShoppingBag,
          color: 'text-blue-500',
        },
        {
          label: 'Total Assinantes',
          value: adminStatsData.totalClients.toString(),
          icon: Users,
          color: 'text-amber-500',
        },
        {
          label: 'Crescimento',
          value: '+12.5%',
          icon: TrendingUp,
          color: 'text-green-500',
        },
      ]
    : [
        {
          label: 'Clientes Atendidos',
          value: statsData.clientsServed.toString(),
          icon: UserIcon,
          color: 'text-blue-500',
        },
        {
          label: 'Faturamento',
          value: `R$ ${statsData.totalRevenue.toFixed(2)}`,
          icon: TrendingUp,
          color: 'text-green-500',
        },
        {
          label: 'Média/Dia',
          value: statsData.averagePerDay,
          icon: Clock,
          color: 'text-purple-500',
        },
        {
          label: 'Meus Clientes',
          value: clients.length.toString(),
          icon: Users,
          color: 'text-amber-500',
        },
      ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Barber Profile Header */}
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 md:pt-0">
        <div>
          <h2 className="text-xl md:text-3xl font-display font-bold">
            Indicadores
          </h2>
          <p className="text-neutral-500">
            {isAdmin
              ? 'Gestão estratégica da Barbearia'
              : `Sua performance, ${user.name}`}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="bg-neutral-900 border border-neutral-800 p-1 rounded-2xl flex whitespace-nowrap">
            {(['monthly', 'quarterly', 'semiannual', 'annual'] as const)
              .filter((p) => isAdmin || p === 'monthly')
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                    period === p
                      ? 'bg-amber-500 text-black'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {p === 'monthly'
                    ? 'Mensal'
                    : p === 'quarterly'
                      ? 'Trim'
                      : p === 'semiannual'
                        ? 'Semest'
                        : 'Anual'}
                </button>
              ))}
          </div>
        </div>
      </header>

      {/* Main Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-neutral-900 border border-neutral-800 p-4 md:p-6 rounded-3xl group hover:border-amber-500/30 transition-all flex flex-col items-center text-center"
          >
            <stat.icon
              className={`${stat.color} mb-3 md:mb-4 w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110`}
            />
            <p className="text-neutral-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
              {stat.label}
            </p>
            <p className="text-xl md:text-2xl font-display font-bold mt-0.5 md:mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart - Always visible but context differs */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 p-4 md:p-8 rounded-3xl space-y-6 md:h-[450px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold">
              Crescimento Financeiro
            </h3>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
              Atualizado
            </span>
          </div>
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isAdmin ? [] : statsData.chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#262626"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#525252"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '12px',
                  }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketplace Summary - Admin ONLY */}
        {isAdmin ? (
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="text-amber-500" /> Marketplace
            </h3>
            <div className="p-6 bg-black/20 border border-white/5 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={bestSeller.image}
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                />
                <div>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                    Campeão de Vendas
                  </p>
                  <h4 className="font-bold text-lg">{bestSeller.name}</h4>
                </div>
              </div>
              <div className="h-[1px] bg-neutral-800"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">
                  Unidades Vendidas
                </span>
                <span className="font-bold">0</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                Resumo de Categorias
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Cabelo</span>
                  <span className="font-bold text-green-500">65%</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[65%]"></div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Second Row: Subscriber Info - Admin ONLY */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">Assinantes por Plano</h3>
              <p className="text-xs text-neutral-500">
                Base de assinaturas ativa
              </p>
            </div>
            <div className="w-48 h-48 relative">
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
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold">
                  {adminStatsData.totalClients}
                </span>
                <span className="text-[9px] uppercase font-bold text-neutral-500">
                  Total
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowSubscribers(true)}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors shadow-lg active:scale-95"
            >
              <Eye size={16} /> Gestão de Clientes
            </button>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/5 to-neutral-900 border border-amber-500/10 p-8 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-amber-500" /> Insights de Gestão
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-neutral-950/50 rounded-2xl border border-white/5 space-y-2">
                <p className="font-bold text-amber-500">Potencial de Venda</p>
                <p className="text-xs text-neutral-400">
                  Taxa de cross-sell de pomadas aumentou 12% após treinamento da
                  equipe.
                </p>
              </div>
              <div className="p-5 bg-neutral-950/50 rounded-2xl border border-white/5 space-y-2">
                <p className="font-bold text-amber-500">Conversão Premium</p>
                <p className="text-xs text-neutral-400">
                  Campanha de Junho gerou 14 novas assinaturas Premium.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriber List Modal - Admin & Barbers */}
      {showSubscribers && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-5xl rounded-[2.5rem] p-6 md:p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(245,158,11,0.05)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-3xl font-display font-black tracking-tighter text-white">
                  GESTÃO DE CLIENTES
                </h3>
                <p className="text-neutral-500 text-sm font-medium">
                  Monitoramento e fidelização da base ativa
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-neutral-800 p-1 rounded-2xl flex gap-1">
                  {(['ALL', 'DEBT', 'CHURN'] as const).map((s) => {
                    const count = clients.filter(
                      (c) => s === 'ALL' || c.status === s,
                    ).length;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          statusFilter === s
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {s === 'ALL'
                          ? 'Todos'
                          : s === 'DEBT'
                            ? 'Inadimplentes'
                            : 'Churn'}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[8px] ${
                            statusFilter === s
                              ? 'bg-black/20'
                              : 'bg-neutral-700 text-neutral-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowSubscribers(false)}
                  className="p-3 bg-neutral-800 border border-neutral-700/50 rounded-2xl text-neutral-400 hover:text-white transition-all hover:scale-105"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <Scissors
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-amber-500 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou whatsapp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-neutral-800 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-amber-500/40 transition-all font-medium text-sm"
                />
              </div>
              <div className="flex bg-neutral-800 p-1 rounded-2xl gap-1">
                {(['ALL', 'START', 'PREMIUM'] as const).map((p) => {
                  const count = clients.filter(
                    (c) => p === 'ALL' || c.plan === p,
                  ).length;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlanFilter(p)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        planFilter === p
                          ? 'bg-neutral-700 text-amber-500 border border-amber-500/20'
                          : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      {p === 'ALL' ? 'Todos Planos' : p}
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[8px] ${
                          planFilter === p
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-neutral-700 text-neutral-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-neutral-900 z-10">
                    <tr className="text-[10px] uppercase font-black text-neutral-500 tracking-[0.2em] border-b border-neutral-800">
                      <th className="py-4 px-4 font-black">Cliente</th>
                      <th className="py-4 px-4 font-black">Contato</th>
                      <th className="py-4 px-4 font-black">Plano</th>
                      <th className="py-4 px-4 font-black">Status</th>
                      <th className="py-4 px-4 font-black">Última Renovação</th>
                      <th className="py-4 px-4 font-black text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {clients
                      .filter((c) => {
                        const matchesSearch =
                          c.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (c.whatsapp && c.whatsapp.includes(searchTerm));
                        const matchesStatus =
                          statusFilter === 'ALL' || c.status === statusFilter;
                        const matchesPlan =
                          planFilter === 'ALL' || c.plan === planFilter;
                        return matchesSearch && matchesStatus && matchesPlan;
                      })
                      .map((client) => (
                        <tr
                          key={client.id}
                          className="group hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                {client.image ? (
                                  <img
                                    src={client.image}
                                    alt={client.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <UserIcon
                                    size={20}
                                    className="text-neutral-600"
                                  />
                                )}
                              </div>
                              <span className="font-bold text-sm text-neutral-200">
                                {client.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-4 text-xs font-medium text-neutral-500">
                            {client.whatsapp || 'N/A'}
                          </td>
                          <td className="py-5 px-4">
                            <span
                              className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                                client.plan === 'PREMIUM'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                              }`}
                            >
                              {client.plan}
                            </span>
                          </td>
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  client.status === 'PAID'
                                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                                    : client.status === 'DEBT'
                                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                      : 'bg-neutral-600'
                                }`}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {client.status === 'PAID'
                                  ? 'Em dia'
                                  : client.status === 'DEBT'
                                    ? 'Inadimplente'
                                    : 'Churn'}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-4 text-xs font-medium text-neutral-400">
                            {client.lastRenewal || 'N/A'}
                          </td>
                          <td className="py-5 px-4 text-right">
                            <button className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/5 hover:border-white/10 text-neutral-400 hover:text-white">
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
