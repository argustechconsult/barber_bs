import React, { useRef, useState } from 'react';
import { User, UserPlan, UserRole, Barbeiro, Service } from '../types';
import {
  SERVICES as INITIAL_SERVICES,
  MOCK_BARBERS as INITIAL_BARBERS,
} from '../constants';
import {
  getServices,
  updateService,
  deleteService,
} from '../actions/service.actions';
import { createService } from '../actions/stripe.actions';
import {
  Camera,
  User as UserIcon,
  Save,
  LogOut,
  Scissors,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user.role === UserRole.ADMIN;
  const isStaff =
    user.role === UserRole.BARBEIRO || user.role === UserRole.ADMIN;

  const [services, setServices] = useState<Service[]>([]); // Initialize empty or wait for fetch
  const [barbers, setBarbers] = useState<Barbeiro[]>(INITIAL_BARBERS);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  // Fetch Services
  React.useEffect(() => {
    async function load() {
      const result = await getServices();
      if (result.success && result.services) {
        setServices(result.services);
      }
    }
    load();
  }, []);

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

  // Currency Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const handleUpdateService = async (
    id: string,
    field: 'price' | 'name',
    value: string | number,
  ) => {
    // Optimistic Update
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const handleSaveService = async (
    id: string,
    data: { price?: number; name?: string },
  ) => {
    await updateService(id, data);
  };

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'service' | 'barber' | null;
    id: string | null;
  }>({ isOpen: false, type: null, id: null });

  const confirmDelete = async () => {
    if (!deleteConfirmation.id || !deleteConfirmation.type) return;

    if (deleteConfirmation.type === 'service') {
      const result = await deleteService(deleteConfirmation.id);
      if (result.success) {
        setServices((prev) =>
          prev.filter((s) => s.id !== deleteConfirmation.id),
        );
      } else {
        alert('Erro ao remover serviço');
      }
    } else if (deleteConfirmation.type === 'barber') {
      setBarbers((prev) => prev.filter((b) => b.id !== deleteConfirmation.id));
    }

    setDeleteConfirmation({ isOpen: false, type: null, id: null });
  };

  const handleDeleteService = (id: string) => {
    setDeleteConfirmation({ isOpen: true, type: 'service', id });
  };

  const deleteBarber = (id: string) => {
    setDeleteConfirmation({ isOpen: true, type: 'barber', id });
  };

  // ... (keep handleAddBarber etc) ...

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

  // ... (handleAddService) ...

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const rawPrice = formData.get('price') as string;
    const price = parseCurrency(rawPrice);

    const result = await createService({ name, price });
    if (result.success && result.service) {
      setServices([...services, result.service as any]); // Type casting if needed or fix types
      setShowAddService(false);
      // Optionally fetch again to be sure
    } else {
      alert('Erro ao criar serviço');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      {/* ... header ... */}
      <header className="text-center pt-4">
        <h2 className="text-4xl font-display font-bold">Configurações</h2>
        <p className="text-neutral-500 mt-2">
          Personalize seu perfil profissional
        </p>
      </header>
      {/* ... content ... */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div
          className={`lg:col-span-4 space-y-8 ${
            !isStaff ? 'lg:col-start-5' : ''
          }`}
        >
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-8 shadow-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-amber-500 overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {user.whatsapp && user.whatsapp.startsWith('data:image') ? (
                    <img
                      src={user.whatsapp}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={48} className="text-neutral-600" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-amber-500 p-3 rounded-full text-black shadow-xl hover:scale-110 transition-transform"
                >
                  <Camera size={20} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="text-center w-full">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-neutral-600 tracking-widest">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) =>
                      onUpdateUser({ ...user, name: e.target.value })
                    }
                    className="font-bold text-lg bg-neutral-800 border border-neutral-700 text-center rounded-xl p-3 focus:border-amber-500 outline-none w-full transition-all"
                    placeholder="Seu Nome"
                  />
                </div>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mt-4 inline-block">
                  {user.role}
                </span>
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
                  {barbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={barber.foto}
                          className="w-12 h-12 rounded-2xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-sm">{barber.nome}</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                            Ativo
                          </p>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Scissors className="text-amber-500" /> Serviços & Preços
                  </h3>
                  <button
                    onClick={() => setShowAddService(true)}
                    className="p-3 bg-amber-500 text-black rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-amber-500/10"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="p-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4 group relative"
                    >
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="absolute top-4 right-4 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                        title="Remover Serviço"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="border-b border-neutral-800 pb-2 mr-6">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) =>
                            handleUpdateService(
                              service.id,
                              'name',
                              e.target.value,
                            )
                          }
                          onBlur={(e) =>
                            handleSaveService(service.id, {
                              name: e.target.value,
                            })
                          }
                          className="bg-transparent text-sm font-bold w-full outline-none focus:text-amber-500 transition-colors placeholder-neutral-700"
                          placeholder="Nome do Serviço"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                          Valor do Corte
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold w-32 focus:border-amber-500/40 outline-none text-right"
                            value={formatCurrency(service.price)}
                            onChange={(e) =>
                              handleUpdateService(
                                service.id,
                                'price',
                                parseCurrency(e.target.value),
                              )
                            }
                            onBlur={() =>
                              handleSaveService(service.id, {
                                price: service.price,
                              })
                            }
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
              <p className="text-neutral-500 font-medium">
                Mantenha seus dados atualizados para que os clientes o
                identifiquem corretamente no momento do agendamento.
              </p>
              <div className="pt-8 space-y-4">
                <div className="p-4 bg-neutral-800/40 rounded-2xl border border-white/5 text-left">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                    Dica Profissional
                  </p>
                  <p className="text-xs text-neutral-400">
                    Barbeiros com fotos de alta qualidade e nomes completos
                    transmitem 40% mais confiança para novos clientes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal - Admin Only */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">Novo Serviço</h3>
              <button
                onClick={() => setShowAddService(false)}
                className="p-2 text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddService} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Nome do Serviço
                </label>
                <input
                  name="name"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="Ex: Corte Degrade"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Preço (R$)
                </label>
                <input
                  name="price"
                  type="text"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="R$ 0,00"
                  onChange={(e) => {
                    // Auto-masking for new input
                    const val = parseCurrency(e.target.value);
                    e.target.value = formatCurrency(val);
                  }}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
              >
                Criar Serviço
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Barber Modal - Admin Only */}
      {showAddBarber && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">
                Novo Profissional
              </h3>
              <button
                onClick={() => setShowAddBarber(false)}
                className="p-2 text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddBarber} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Nome Completo
                </label>
                <input
                  name="nome"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="Ex: Lucas Santana"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Email de Acesso
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="lucas@barbearia.com"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
              >
                Adicionar à Equipe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <Trash2 size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Confirma a exclusão?</h3>
              <p className="text-sm text-neutral-500">
                Esta ação é irreversível e removerá o item permanentemente do
                sistema.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setDeleteConfirmation({ isOpen: false, type: null, id: null })
                }
                className="bg-neutral-800 text-white font-bold py-4 rounded-2xl hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 text-white font-bold py-4 rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
