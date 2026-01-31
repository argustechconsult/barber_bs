import React, { useRef, useState } from 'react';
import { User, UserPlan, UserRole, Barbeiro, Service } from '../types';
import { ImageCropper } from './shared/ImageCropper';
// import {
//   SERVICES as INITIAL_SERVICES,
//   MOCK_BARBERS as INITIAL_BARBERS,
// } from '../constants'; // REMOVED
import {
  getServices,
  updateService,
  deleteService,
  createService, // Now imported from service.actions
} from '../actions/services/service.actions';
// import { createService } from '../actions/payment/stripe.actions'; // REMOVED
import {
  getPlans,
  createPlan,
  deletePlan,
} from '../actions/services/plan.actions';
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
  Sparkles,
  CalendarCheck,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [barbers, setBarbers] = useState<Barbeiro[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppingTarget, setCroppingTarget] = useState<{
    type: 'user' | 'barber';
    id?: string;
  } | null>(null);
  const [offDays, setOffDays] = useState<string[]>(user.offDays || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch Services, Plans & Barbers
  React.useEffect(() => {
    async function load() {
      // Services
      const result = await getServices();
      if (result.success && result.services) {
        setServices(result.services);
      }
      // Plans
      const planResult = await getPlans();
      if (planResult.success && planResult.plans) {
        setPlans(planResult.plans);
      }
      // Barbers
      const { getBarbers } = await import('../actions/users/barber.actions');
      const barbersResult = await getBarbers();
      if (barbersResult.success && barbersResult.barbers) {
        setBarbers(barbersResult.barbers);
      }
    }
    load();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        if (!croppingTarget) {
          setCroppingTarget({ type: 'user' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    try {
      // 1. Identify old image to delete later
      let oldImageUrl: string | undefined;

      if (croppingTarget?.type === 'user') {
        oldImageUrl = user.image;
      } else if (croppingTarget?.type === 'barber' && croppingTarget.id) {
        const barber = barbers.find((b) => b.id === croppingTarget.id);
        oldImageUrl = barber?.foto;
      }

      // Convert base64 to blob/file
      const res = await fetch(croppedImage);
      const blob = await res.blob();
      const file = new File([blob], 'profile-image.jpg', {
        type: 'image/jpeg',
      });

      // 2. Upload to Vercel Blob
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const newBlob = await response.json();
      const imageUrl = newBlob.url;

      // 3. Delete old image if it exists and is a blob URL
      if (
        oldImageUrl &&
        oldImageUrl.includes('public.blob.vercel-storage.com')
      ) {
        try {
          await fetch(`/api/upload?url=${oldImageUrl}`, {
            method: 'DELETE',
          });
        } catch (delError) {
          console.error('Failed to delete old image:', delError);
          // Non-blocking error
        }
      }

      // 4. Update State & DB
      if (croppingTarget?.type === 'user') {
        onUpdateUser({
          ...user,
          image: imageUrl,
        });
      } else if (croppingTarget?.type === 'barber' && croppingTarget.id) {
        setBarbers((prev) =>
          prev.map((b) =>
            b.id === croppingTarget.id ? { ...b, foto: imageUrl } : b,
          ),
        );
        const { updateBarberSettings } =
          await import('../actions/users/barber.actions');
        await updateBarberSettings(croppingTarget.id, { image: imageUrl });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } // ... rest of function

    setImageToCrop(null);
    setCroppingTarget(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    const { updateUser } = await import('../actions/users/user.actions');
    const result = await updateUser(user.id, {
      name: user.name,
      image: user.image,
    });

    if (result.success) {
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } else {
      alert(result.message || 'Erro ao salvar perfil');
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
    type: 'service' | 'barber' | 'plan' | null;
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
      const { deleteBarber } = await import('../actions/users/barber.actions');
      const result = await deleteBarber(deleteConfirmation.id);
      if (result.success) {
        setBarbers((prev) =>
          prev.filter((b) => b.id !== deleteConfirmation.id),
        );
      } else {
        alert('Erro ao excluir barbeiro');
      }
    } else if (deleteConfirmation.type === 'plan') {
      const result = await deletePlan(deleteConfirmation.id);
      if (result.success) {
        setPlans((prev) => prev.filter((p) => p.id !== deleteConfirmation.id));
      } else {
        alert('Erro ao remover plano');
      }
    }

    setDeleteConfirmation({ isOpen: false, type: null, id: null });
  };

  const handleDeleteService = (id: string) => {
    setDeleteConfirmation({ isOpen: true, type: 'service', id });
  };

  const deleteBarber = (id: string) => {
    setDeleteConfirmation({ isOpen: true, type: 'barber', id });
  };

  const deletePlanHandler = (id: string) => {
    setDeleteConfirmation({ isOpen: true, type: 'plan', id });
  };

  // ... (keep handleAddBarber etc) ...

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleAddBarber = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;

    const { createBarberInvite } = await import('../actions/auth/auth.actions');
    const result = await createBarberInvite(nome, email);

    if (result.success && result.inviteLink) {
      setInviteLink(result.inviteLink);
      // Only close modal after they copy/see the link.
      // Or we can change the modal content to show the link.
      // For simplicity, let's keep the modal open but change state to show link.
    } else {
      alert(result.message || 'Erro ao criar convite');
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Link copiado!');
      setInviteLink(null);
      setShowAddBarber(false);
    }
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

  const handleAddPlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const rawPrice = formData.get('price') as string;
    const price = parseCurrency(rawPrice);

    const result = await createPlan({ name, price });
    if (result.success && result.plan) {
      setPlans([result.plan, ...plans]);
      setShowAddPlan(false);
    } else {
      alert('Erro ao criar plano: ' + (result.message || ''));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      {/* ... header ... */}
      <header className="text-center pt-4">
        <h2 className="text-2xl md:text-4xl font-display font-bold">
          Configurações
        </h2>
        <p className="text-sm md:text-base text-neutral-500 mt-2">
          Personalize seu perfil
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
          <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative group">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-amber-500 overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {(user.image || user.whatsapp)?.startsWith('data:image') ||
                  (user.image || user.whatsapp)?.startsWith('http') ? (
                    <img
                      src={user.image || user.whatsapp}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src="/default.jpeg"
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => {
                    setCroppingTarget({ type: 'user' });
                    fileInputRef.current?.click();
                  }}
                  className="absolute bottom-0 right-0 bg-amber-500 p-2.5 md:p-3 rounded-full text-black shadow-xl hover:scale-110 transition-transform"
                >
                  <Camera size={18} className="md:w-5 md:h-5" />
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
                    className="font-bold text-base md:text-lg bg-neutral-800 border border-neutral-700 text-center rounded-xl p-2.5 md:p-3 focus:border-amber-500 outline-none w-full transition-all"
                    placeholder="Seu Nome"
                  />
                </div>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mt-3 md:mt-4 inline-block">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleSaveProfile}
                className="w-full bg-amber-500 text-black font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg active:scale-[0.98]"
              >
                <Save size={18} /> Salvar Alterações
              </button>
              <button
                onClick={onLogout}
                className="w-full bg-neutral-800 border border-neutral-700 text-red-500 font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-700 transition-all active:scale-[0.98]"
              >
                <LogOut size={18} /> Sair da Conta
              </button>
            </div>
          </div>
        </div>

        {/* Admin and Staff Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Scheduling Settings for Staff - Moved to top */}
          {isStaff && (
            <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-xl animate-in fade-in slide-in-from-left-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
                  <CalendarCheck size={20} className="md:w-6 md:h-6" />
                </div>
                <h3 className="text-lg md:text-xl font-bold">
                  Configuração de Agenda
                </h3>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const interval = Number(formData.get('interval')) || 10;
                  const start = (formData.get('start') as string) || '09:00';
                  const end = (formData.get('end') as string) || '18:00';

                  const { updateBarberSettings } =
                    await import('../actions/users/barber.actions');
                  const result = await updateBarberSettings(user.id, {
                    interval,
                    startTime: start,
                    endTime: end,
                    offDays,
                  });

                  if (result.success) {
                    setShowSuccessModal(true);
                    setTimeout(() => setShowSuccessModal(false), 3000); // Auto hide after 3s
                    onUpdateUser({
                      ...user,
                      appointmentInterval: interval,
                      startTime: start,
                      endTime: end,
                      offDays,
                    });
                  } else {
                    alert('Erro ao salvar configurações: ' + result.message);
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                    Intervalo entre atendimentos (minutos)
                  </label>
                  <div className="relative">
                    <select
                      name="interval"
                      defaultValue={user.appointmentInterval || 10}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-4 outline-none focus:border-amber-500/40 appearance-none text-sm md:text-base"
                    >
                      {Array.from({ length: 10 }).map((_, i) => {
                        const val = 10 + i * 5; // 10, 15, ..., 55 (10 items: 0..9 -> 10 + 45 = 55)
                        return (
                          <option key={val} value={val}>
                            {val} min
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                      <ArrowDownCircle size={16} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                      Início (Horário)
                    </label>
                    <div className="relative">
                      <select
                        name="start"
                        defaultValue={user.startTime || '09:00'}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-4 outline-none focus:border-amber-500/40 appearance-none text-sm md:text-base"
                      >
                        {Array.from({ length: 96 }).map((_, i) => {
                          const totalMins = i * 15;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const time = `${h.toString().padStart(2, '0')}:${m
                            .toString()
                            .padStart(2, '0')}`;
                          return (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                        <ArrowDownCircle size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                      Fim (Horário)
                    </label>
                    <div className="relative">
                      <select
                        name="end"
                        defaultValue={user.endTime || '18:00'}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-4 outline-none focus:border-amber-500/40 appearance-none text-sm md:text-base"
                      >
                        {Array.from({ length: 96 }).map((_, i) => {
                          const totalMins = i * 15;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const time = `${h.toString().padStart(2, '0')}:${m
                            .toString()
                            .padStart(2, '0')}`;
                          return (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                        <ArrowDownCircle size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                      Folga - {format(currentMonth, 'MM/yyyy')}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            (prev) =>
                              new Date(
                                prev.getFullYear(),
                                prev.getMonth() - 1,
                                1,
                              ),
                          )
                        }
                        className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            (prev) =>
                              new Date(
                                prev.getFullYear(),
                                prev.getMonth() + 1,
                                1,
                              ),
                          )
                        }
                        className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-4">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                        <span
                          key={idx}
                          className="text-[8px] font-bold text-neutral-600"
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const start = startOfMonth(currentMonth);
                        const end = endOfMonth(currentMonth);
                        const days = eachDayOfInterval({ start, end });

                        // Fill leading empty days
                        const blanks = Array.from({ length: start.getDay() });

                        return (
                          <>
                            {blanks.map((_, i) => (
                              <div key={`blank-${i}`} />
                            ))}
                            {days.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const isOff = offDays.includes(dateStr);

                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => {
                                    setOffDays((prev) =>
                                      isOff
                                        ? prev.filter((d) => d !== dateStr)
                                        : [...prev, dateStr],
                                    );
                                  }}
                                  className={`
                                    aspect-square rounded-xl text-xs font-bold transition-all
                                    flex items-center justify-center
                                    ${
                                      isOff
                                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                        : 'hover:bg-neutral-800 text-neutral-400 border border-transparent'
                                    }
                                  `}
                                >
                                  {format(day, 'd')}
                                </button>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-[8px] text-neutral-600 text-center italic">
                    Clique nas datas para marcar sua folga
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-neutral-800 text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-700 transition-all shadow-lg active:scale-[0.98]"
                >
                  <Save size={18} /> Salvar Agenda
                </button>
              </form>
            </div>
          )}

          {isAdmin && (
            <>
              <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Users className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />{' '}
                    Equipe de Barbeiros
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
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="relative group/photo">
                          <img
                            src={barber.foto}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover"
                          />
                          <button
                            onClick={() => {
                              setCroppingTarget({
                                type: 'barber',
                                id: barber.id,
                              });
                              fileInputRef.current?.click();
                            }}
                            className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                          >
                            <Camera size={16} className="text-white" />
                          </button>
                        </div>
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

              <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in fade-in slide-in-from-top-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Scissors className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />{' '}
                    Serviços & Preços
                  </h3>
                  <button
                    onClick={() => setShowAddService(true)}
                    className="p-2.5 md:p-3 bg-amber-500 text-black rounded-xl md:rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-amber-500/10"
                  >
                    <Plus size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="p-5 md:p-6 bg-neutral-950 border border-neutral-800 rounded-[1.5rem] md:rounded-3xl space-y-4 group relative"
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

              {/* Plan Management Section */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in fade-in slide-in-from-top-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Sparkles className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />{' '}
                    Planos & Assinaturas
                  </h3>
                  <button
                    onClick={() => setShowAddPlan(true)}
                    className="p-2.5 md:p-3 bg-amber-500 text-black rounded-xl md:rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-amber-500/10"
                  >
                    <Plus size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {plans.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 border border-neutral-800 rounded-3xl border-dashed">
                      Nenhum plano cadastrado.
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-6 bg-neutral-950 border border-neutral-800 rounded-3xl flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-bold text-lg">{plan.name}</p>
                          <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mt-1">
                            {formatCurrency(plan.price)} / mês
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => deletePlanHandler(plan.id)}
                            className="p-2 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
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
                {inviteLink ? 'Convite Gerado!' : 'Novo Profissional'}
              </h3>
              <button
                onClick={() => {
                  setShowAddBarber(false);
                  setInviteLink(null);
                }}
                className="p-2 text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {inviteLink ? (
              <div className="space-y-6 text-center">
                <p className="text-neutral-400">
                  O convite foi criado com sucesso. Envie o link abaixo para o
                  barbeiro completar o cadastro e definir a senha.
                </p>
                <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 break-all text-sm font-mono text-amber-500">
                  {inviteLink}
                </div>
                <button
                  onClick={copyLink}
                  className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                >
                  Copiar Link e Fechar
                </button>
              </div>
            ) : (
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
                    name="email"
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                    placeholder="lucas@barbearia.com"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                >
                  Gerar Convite
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold">Novo Plano</h3>
              <button
                onClick={() => setShowAddPlan(false)}
                className="p-2 text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPlan} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Nome do Plano
                </label>
                <input
                  name="name"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="Ex: Assinatura VIP"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
                  Valor Mensal (R$)
                </label>
                <input
                  name="price"
                  type="text"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40"
                  placeholder="R$ 0,00"
                  onChange={(e) => {
                    const val = parseCurrency(e.target.value);
                    e.target.value = formatCurrency(val);
                  }}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 text-black font-bold py-5 rounded-3xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
              >
                Criar Plano
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-300 max-w-sm w-full">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2">
              <CalendarCheck size={32} />
            </div>
            <h3 className="text-xl font-bold font-display text-center">
              Configurações Salvas!
            </h3>
            <p className="text-neutral-500 text-center text-sm">
              Sua agenda foi atualizada com sucesso e já está disponível para os
              clientes.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-2 w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-colors"
            >
              Concluir
            </button>
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

      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
          circular={true}
        />
      )}
    </div>
  );
};

export default SettingsView;
