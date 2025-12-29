
import React, { useRef, useState } from 'react';
import { User, UserPlan, UserRole, Barbeiro } from '../types';
import { SERVICES as INITIAL_SERVICES, MOCK_BARBERS as INITIAL_BARBERS } from '../constants';
import { Camera, User as UserIcon, Save, LogOut, Scissors, Plus, Trash2, Users, X } from 'lucide-react';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user.role === UserRole.ADMIN;
  const isStaff = user.role === UserRole.BARBEIRO || user.role === UserRole.ADMIN;
  
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [barbers, setBarbers] = useState<Barbeiro[]>(INITIAL_BARBERS);
  const [showAddBarber, setShowAddBarber] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({
          ...user,
          whatsapp: reader.result as string, // Using whatsapp field to store base64 for simulation
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateServicePrice = (id: string, value: number) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, price: value } : s));
  };

  const deleteBarber = (id: string) => {
    if (confirm('Tem certeza que deseja remover este barbeiro da equipe?')) {
      setBarbers(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleAddBarber = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBarber: Barbeiro = {
      id: Math.random().toString(36).substr(2, 9),
      nome: formData.get('nome') as string,
      foto: 'https://picsum.photos/200/200?random=' + Math.random(),
      bio: '',
      intervaloAtendimento: 30,
      horariosTrabalho: { inicio: '09:00', fim: '19:00' },
      ativo: true,
    };
    setBarbers([...barbers, newBarber]);
    setShowAddBarber(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="text-center pt-16">
        <h2 className="text-4xl font-display font-bold">Configurações</h2>
        <p className="text-neutral-500 mt-2">Personalize seu perfil profissional</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-8 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-amber-500 overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {user.whatsapp && user.whatsapp.startsWith('data:image') ? (
                    <img src={user.whatsapp} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={48} className="text-neutral-600" />
                  )}
                </div>
                {isStaff && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-amber-500 p-3 rounded-full text-black shadow-xl hover:scale-110 transition-transform"
                  >
                    <Camera size={20} />
                  </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>
              <div className="text-center w-full">
                {isStaff ? (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-neutral-600 tracking-widest">Seu Nome Profissional</label>
                    <input 
                      type="text"
                      value={user.name}
                      onChange={(e) => onUpdateUser({...user, name: e.target.value})}
                      className="font-bold text-lg bg-neutral-800 border border-neutral-700 text-center rounded-xl p-3 focus:border-amber-500 outline-none w-full transition-all"
                      placeholder="Nome Exibido para Clientes"
                    />
                  </div>
                ) : (
                  <p className="font-bold text-lg">{user.name}</p>
                )}
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mt-4 inline-block">{user.role}</span>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => alert('Alterações salvas com sucesso!')}
                className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg active:scale-[0.98]"
              >
                <Save size={18} /> Salvar Alterações
              </button>
              <button 
                onClick={onLogout}
                className="w-full bg-neutral-800 border border-neutral-700 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-700 transition-all active:scale-[0.98]"
              >
                <LogOut size={18} /> Sair da Conta
              </button>
            </div>
          </div>
        </div>

        {/* Admin and Staff Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Admin only sections removed from here if requested to be "removed from dashboard" but kept in management */}
          {isAdmin && (
            <>
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-amber-500" /> Equipe de Barbeiros
                  </h3>
                  <button 
                    onClick={() => setShowAddBarber(true)}
                    className="p-3 bg-amber-500 text-black rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-amber-500/10"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {barbers.map(barber => (
                    <div key={barber.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <img src={barber.foto} className="w-12 h-12 rounded-2xl object-cover" />
                        <div>
                          <p className="font-bold text-sm">{barber.nome}</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Ativo</p>
                        </div>
                      </div>
                      {barber.id !== user.barbeiroId && (
                        <button 
                          onClick={() => deleteBarber(barber.id)}
                          className="p-2 text-neutral-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-8 animate-in fade-in slide-in-from-top-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Scissors className="text-amber-500" /> Serviços & Preços
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map(service => (
                    <div key={service.id} className="p-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4">
                      <p className="text-sm font-bold border-b border-neutral-800 pb-2">{service.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Valor do Corte</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 font-bold text-xs">R$</span>
                          <input 
                            type="number"
                            className="bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-3 text-sm font-bold w-28 focus:border-amber-500/40 outline-none"
                            value={service.price}
                            onChange={(e) => updateServicePrice(service.id, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!isAdmin && isStaff && (
            <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-[2.5rem] text-center space-y-4 shadow-xl">
               <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="text-amber-500" size={32} />
               </div>
               <p className="text-neutral-500 font-medium">Mantenha seus dados atualizados para que os clientes o identifiquem corretamente no momento do agendamento.</p>
               <div className="pt-8 space-y-4">
                 <div className="p-4 bg-neutral-800/40 rounded-2xl border border-white/5 text-left">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Dica Profissional</p>
                    <p className="text-xs text-neutral-400">Barbeiros com fotos de alta qualidade e nomes completos transmitem 40% mais confiança para novos clientes.</p>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Barber Modal - Admin Only */}
      {showAddBarber && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">Novo Profissional</h3>
              <button onClick={() => setShowAddBarber(false)} className="p-2 text-neutral-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddBarber} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">Nome Completo</label>
                <input name="nome" required className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40" placeholder="Ex: Lucas Santana" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">Email de Acesso</label>
                <input type="email" required className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40" placeholder="lucas@barbearia.com" />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95">Adicionar à Equipe</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
