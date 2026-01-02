import React, { useState, useMemo } from 'react';
import { User, Barbeiro, Service, UserPlan } from '../types';
import { MOCK_BARBERS, SERVICES, MOCK_APPOINTMENTS } from '../constants';
import {
  ChevronRight,
  Check,
  CalendarCheck,
  ArrowLeft,
  User as UserIcon,
  MapPin,
  QrCode,
  Banknote,
  Sparkles,
  X,
} from 'lucide-react';

interface ClienteAppProps {
  user: User;
}

// Simple in-memory global to persist bookings during session for testing "occupied" logic
// Key format: "barberId-YYYY-MM-DD-HH:mm"
const GLOBAL_BOOKED_SLOTS = new Set<string>();

// Track new appointments made in this session to enforce logic without backend
import {
  createAppointment,
  getAppointmentsByBarber,
} from '../actions/appointment.actions';
import { getBarbers } from '../actions/user.actions';
// const SESSION_APPOINTMENTS: { clientId: string; date: string }[] = [];

const ClienteApp: React.FC<ClienteAppProps> = ({ user }) => {
  const [step, setStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<Barbeiro | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  // Fix: Use local date for initial state to avoid UTC mismatch near midnight
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'DINHEIRO' | null>(
    null,
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPremiumRestriction, setShowPremiumRestriction] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(
    null,
  );
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [barbers, setBarbers] = useState<Barbeiro[]>([]);

  // Fetch Barbers
  React.useEffect(() => {
    async function fetchBarbers() {
      const fetched = await getBarbers();
      if (fetched && fetched.length > 0) {
        setBarbers(fetched);
      }
    }
    fetchBarbers();
  }, []);

  // Fetch occupied slots when barber or date changes
  React.useEffect(() => {
    async function fetchSlots() {
      if (!selectedBarber || !selectedDateStr) return;

      // This dateStr needs to be combined with times, but actions might handle raw ISO or just YYYY-MM-DD
      // The action I wrote takes YYYY-MM-DD string
      const result = await getAppointmentsByBarber(
        selectedBarber.id,
        selectedDateStr,
      );
      if (result.success && result.occupiedTimes) {
        setOccupiedSlots(new Set(result.occupiedTimes));
      } else {
        setOccupiedSlots(new Set());
      }
    }
    fetchSlots();
  }, [selectedBarber, selectedDateStr]);

  // Generate the next 14 days starting from today
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push({
        fullDate: date.toISOString().split('T')[0],
        dayName: date
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', ''),
        dayNum: date.getDate(),
        month: date
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', ''),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return dates;
  }, []);

  const toggleService = (service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service],
    );
  };

  const totalPrice = selectedServices.reduce(
    (acc, curr) => acc + curr.price,
    0,
  );

  const isSlotOccupied = (time: string) => {
    // If we have selectedBarber, we check our fetched slots
    // Also check if time passed? (Not implemented yet to keep simple)
    return occupiedSlots.has(time);
  };

  const handleFinalizeBooking = () => {
    if (user.plan === UserPlan.START) {
      setStep(4); // Go to payment
    } else {
      confirmBooking();
    }
  };

  const confirmBooking = async () => {
    // ... Premium logic skipped for now, focusing on basic create

    if (selectedBarber && selectedTime) {
      const dateTimeStr = `${selectedDateStr}T${selectedTime}:00`;

      const result = await createAppointment({
        clientId: user.id,
        barberId: selectedBarber.id,
        date: dateTimeStr,
        serviceIds: selectedServices.map((s) => s.id),
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        alert(result.message || 'Erro ao agendar');
      }
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedBarber(null);
    setSelectedServices([]);
    setSelectedTime('');
    setSelectedDateStr(new Date().toISOString().split('T')[0]);
    setPaymentMethod(null);
    setIsSuccess(false);
    setShowPremiumRestriction(false);
  };

  if (showPremiumRestriction) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400"></div>

          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Sparkles className="text-amber-500 w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-display font-bold text-white">
              Ops, calma aí!
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Como cliente{' '}
              <span className="text-amber-500 font-bold">Premium</span>, você
              tem direito a cortes ilimitados, mas respeitando o intervalo de{' '}
              <span className="text-white font-bold">7 dias</span> entre eles.
            </p>
          </div>

          <div className="bg-neutral-950 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">
              Próximo agendamento disponível
            </p>
            <p className="text-amber-500 font-bold capitalize">
              {nextAvailableDate || 'Na próxima semana'}
            </p>
          </div>

          <button
            onClick={resetFlow}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-colors shadow-lg active:scale-95"
          >
            Voltar para Início
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    const selectedDateObj = availableDates.find(
      (d) => d.fullDate === selectedDateStr,
    );
    return (
      <div className="max-w-md mx-auto pt-16 py-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
          <CalendarCheck className="text-black w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold">Tudo Pronto!</h2>
          <p className="text-neutral-400">
            Agendamento para {selectedDateObj?.dayName},{' '}
            {selectedDateObj?.dayNum} de {selectedDateObj?.month} às{' '}
            {selectedTime}.
          </p>
          {paymentMethod === 'PIX' && (
            <p className="text-amber-500 font-bold text-sm">
              Aguardando pagamento via PIX para confirmar.
            </p>
          )}
        </div>

        {paymentMethod === 'PIX' && (
          <div className="bg-white p-4 rounded-3xl inline-block shadow-xl">
            <div className="w-40 h-40 bg-neutral-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-neutral-300">
              <QrCode size={120} className="text-black" />
            </div>
            <p className="text-black text-[10px] mt-2 font-bold uppercase tracking-widest">
              Escaneie para pagar R$ {totalPrice}
            </p>
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl text-left space-y-4">
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500 text-sm font-medium">
              Barbeiro
            </span>
            <span className="font-bold text-amber-500">
              {selectedBarber?.nome}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 text-sm font-medium">
              Serviços
            </span>
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-white/80">{s.name}</span>
                <span className="text-amber-500/80">R$ {s.price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4 border-t border-neutral-800 font-bold text-xl">
            <span>Total</span>
            <span className="text-amber-500">R$ {totalPrice}</span>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={resetFlow}
            className="inline-flex items-center bg-amber-500 text-black font-bold py-4 px-8 rounded-3xl shadow-lg hover:bg-amber-400 transition-all active:scale-95"
          >
            Voltar para Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col items-center space-y-4 pt-4">
        <div className="w-24 h-24 rounded-full border-4 border-amber-500/30 p-1">
          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border-2 border-amber-500">
            {user.whatsapp && user.whatsapp.startsWith('data:image') ? (
              <img
                src={user.whatsapp}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={40} className="text-neutral-600" />
            )}
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            {user.name}
          </h2>
          <span className="inline-block bg-amber-500/10 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 border border-amber-500/20">
            Plano {user.plan}
          </span>
        </div>
      </header>

      <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h4 className="text-2xl font-display font-bold text-amber-500">
                Escolha um profissional
              </h4>
              <div className="h-1 w-12 bg-amber-500/30 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 gap-6 pb-24">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBarber(b);
                    setStep(2);
                  }}
                  className="bg-neutral-900
    py-2 px-2
    md:py-2 md:px-2
    rounded-2xl md:rounded-[2.5rem]
    border border-neutral-800
    hover:border-amber-500 hover:scale-[1.02]
    transition-all
    group relative overflow-hidden
    flex flex-col items-center text-center
    space-y-2 md:space-y-4
    shadow-xl"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
                  <div className="relative">
                    <img
                      src={b.foto}
                      alt={b.nome}
                      className="w-36 h-48
  md:w-60 md:h-[17.5rem]
  rounded-2xl md:rounded-[2.5rem]
  object-cover
  shadow-2xl
  border-2 border-neutral-800
  group-hover:border-amber-500/50
  transition-colors"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-2 rounded-xl z-20 shadow-lg group-hover:rotate-12 transition-transform">
                      <ChevronRight size={18} strokeWidth={3} />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h5 className="font-bold text-lg group-hover:text-amber-500 transition-colors">
                      {b.nome}
                    </h5>
                    <p className="text-neutral-500 text-[10px] mt-1 uppercase tracking-widest font-bold">
                      Especialista em Estilo
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Premium Upgrade Banner for Start Plan */}
            {user.plan === UserPlan.START && showPremiumBanner && (
              <div className="fixed bottom-20 left-0 right-0 md:left-64 mx-auto w-fit max-w-[90%] md:max-w-md bg-gradient-to-r from-amber-600 to-amber-400 p-4 rounded-[2rem] shadow-2xl shadow-amber-500/20 flex items-center justify-between gap-4 group cursor-pointer hover:scale-[1.02] transition-transform z-40">
                <div className="flex items-center gap-3">
                  <div className="bg-black/20 p-2 rounded-xl">
                    <Sparkles className="text-black w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-black font-bold text-sm">
                      Seja Premium!
                    </p>
                    <p className="text-black/80 text-[10px] font-medium uppercase tracking-widest">
                      Cortes ilimitados por apenas R$ 150
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="text-black" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPremiumBanner(false);
                    }}
                    className="bg-black/10 p-1 rounded-full hover:bg-black/20 transition-colors"
                  >
                    <X size={16} className="text-black" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-bold text-neutral-400 hover:text-amber-500 hover:border-amber-500/50 transition-all uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Trocar Barbeiro
              </button>
              <div className="text-center space-y-2">
                <h4 className="text-2xl font-display font-bold text-amber-500">
                  Selecione os Serviços
                </h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                  Com {selectedBarber?.nome}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {SERVICES.map((s) => {
                const isSelected = selectedServices.some(
                  (item) => item.id === s.id,
                );
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`w-full text-left bg-neutral-900 border p-5 rounded-3xl flex justify-between items-center transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                        : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-neutral-700'
                        }`}
                      >
                        {isSelected && (
                          <Check size={14} className="text-black font-bold" />
                        )}
                      </div>
                      <p className="font-bold text-lg">{s.name}</p>
                    </div>
                    <p
                      className={`font-bold text-xl transition-colors ${
                        isSelected ? 'text-amber-500' : 'text-white'
                      }`}
                    >
                      R$ {s.price}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center space-y-8 pt-4">
              <button
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-3 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold px-12 py-5 rounded-[2rem] shadow-2xl transition-all hover:scale-105"
              >
                Continuar <ChevronRight size={20} strokeWidth={3} />
              </button>
              {selectedServices.length > 0 && (
                <div className="text-center animate-in fade-in slide-in-from-top-2">
                  <span className="bg-amber-500/10 text-amber-500 px-6 py-3 rounded-full border border-amber-500/20 text-base font-bold shadow-lg shadow-amber-500/5">
                    Valor Total: R$ {totalPrice}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-bold text-neutral-400 hover:text-amber-500 transition-all uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Editar Serviços
              </button>
              <h4 className="text-2xl font-display font-bold text-amber-500 text-center">
                Escolha o Horário
              </h4>
            </div>

            <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-8 shadow-2xl">
              {/* Unified Date Selector */}
              <div className="space-y-4">
                <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-[0.2em] text-center">
                  Data
                </p>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {availableDates.map((date) => {
                    // Premium Restriction: Mon-Thu only (Disable Fri(5), Sat(6), Sun(0))
                    const isPremiumRestrictedDay =
                      date.dayName === 'sex' || date.isWeekend;
                    const isDisabled =
                      user.plan === UserPlan.PREMIUM && isPremiumRestrictedDay;
                    const isSelected = selectedDateStr === date.fullDate;
                    return (
                      <button
                        key={date.fullDate}
                        disabled={isDisabled}
                        onClick={() => {
                          setSelectedDateStr(date.fullDate);
                          setSelectedTime('');
                        }}
                        className={`snap-center flex-shrink-0 w-16 py-3 rounded-2xl flex flex-col items-center border transition-all ${
                          isDisabled
                            ? 'opacity-10 grayscale cursor-not-allowed border-transparent'
                            : isSelected
                            ? 'bg-amber-500 border-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-[9px] uppercase font-bold opacity-60">
                          {date.dayName}
                        </span>
                        <span className="text-lg font-bold">{date.dayNum}</span>
                        <span className="text-[9px] uppercase font-bold opacity-60">
                          {date.month}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {user.plan === UserPlan.PREMIUM && (
                  <p className="text-[9px] text-amber-500/50 text-center font-medium italic">
                    Clientes Premium podem agendar apenas de Seg. a Qui.
                  </p>
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                  Resumo
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedServices.map((s) => (
                    <span
                      key={s.id}
                      className="text-[10px] font-bold text-white/70 bg-white/5 px-2 py-1 rounded-full border border-white/5"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
                <div className="inline-block px-4 py-1 bg-amber-500/10 text-amber-500 rounded-full font-bold text-xs">
                  Total R$ {totalPrice}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  '09:00',
                  '10:00',
                  '11:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                ]
                  .filter((time) => {
                    // Filter past times if date is today
                    const now = new Date();
                    // Local "today" string for comparison
                    const localNow = new Date(
                      now.getTime() - now.getTimezoneOffset() * 60000,
                    );
                    const todayStr = localNow.toISOString().split('T')[0];

                    if (selectedDateStr === todayStr) {
                      // Parse time "HH:mm"
                      const [h, m] = time.split(':').map(Number);
                      const slotDate = new Date();
                      slotDate.setHours(h, m, 0, 0);

                      // Compare with current time
                      // We can just compare hours/minutes or timestamps
                      if (slotDate <= now) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map((time) => {
                    const occupied = isSlotOccupied(time);
                    return (
                      <button
                        key={time}
                        disabled={occupied}
                        onClick={() => setSelectedTime(time)}
                        className={`py-4 rounded-2xl border text-sm font-bold transition-all ${
                          occupied
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-700 line-through cursor-not-allowed'
                            : selectedTime === time
                            ? 'bg-amber-500 border-amber-500 text-black scale-105 shadow-lg shadow-amber-500/20'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                        }`}
                      >
                        {occupied ? 'Indisponível' : time}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                disabled={!selectedTime}
                onClick={handleFinalizeBooking}
                className="inline-flex items-center gap-3 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold px-10 py-5 rounded-[2rem] shadow-2xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Finalizar Agendamento <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-bold text-neutral-400 hover:text-amber-500 transition-all uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Mudar Horário
              </button>
              <div className="text-center space-y-2">
                <h4 className="text-2xl font-display font-bold text-amber-500">
                  Pagamento
                </h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                  Plan Start • Confirmar reserva
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setPaymentMethod('PIX')}
                className={`flex items-center gap-4 bg-neutral-900 p-6 rounded-[2rem] border transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-neutral-800'
                }`}
              >
                <div className="bg-amber-500 p-3 rounded-2xl text-black">
                  <QrCode size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">PIX</p>
                  <p className="text-xs text-neutral-500">
                    Pague agora para confirmar seu lugar
                  </p>
                </div>
                {paymentMethod === 'PIX' && (
                  <Check className="text-amber-500" />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('DINHEIRO')}
                className={`flex items-center gap-4 bg-neutral-900 p-6 rounded-[2rem] border transition-all ${
                  paymentMethod === 'DINHEIRO'
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-neutral-800'
                }`}
              >
                <div className="bg-green-500 p-3 rounded-2xl text-black">
                  <Banknote size={24} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">No Local</p>
                  <p className="text-xs text-neutral-500">
                    Pague no balcão (Dinheiro ou Cartão)
                  </p>
                </div>
                {paymentMethod === 'DINHEIRO' && (
                  <Check className="text-amber-500" />
                )}
              </button>
            </div>

            <div className="bg-neutral-900/50 p-6 rounded-3xl border border-white/5 space-y-2 shadow-xl">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Serviços Selecionados</span>
                <span className="font-bold">R$ {totalPrice}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-neutral-800 pt-2">
                <span>Total a pagar</span>
                <span className="text-amber-500">R$ {totalPrice}</span>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                disabled={!paymentMethod}
                onClick={confirmBooking}
                className="inline-flex items-center gap-3 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold px-12 py-5 rounded-[2rem] shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Confirmar e Pagar <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {(step === 1 || isSuccess) && (
        <div
          className={`pt-12 ${
            user.plan === UserPlan.START ? 'pb-32' : 'pb-8'
          } border-t border-neutral-900`}
        >
          <div className="bg-neutral-900/40 p-6 rounded-[2rem] border border-white/5 flex items-center justify-center gap-4 shadow-sm">
            <div className="bg-amber-500/10 p-2 rounded-xl">
              <MapPin className="text-amber-500 w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Localização
              </p>
              <p className="text-xs font-medium text-white/60">
                Av. Paulista, 1000 - São Paulo, SP
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteApp;
