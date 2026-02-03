import React, { useState, useMemo } from 'react';
import { User, Barbeiro, Service, UserPlan } from '../types';
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
  CreditCard,
} from 'lucide-react';

interface ClienteAppProps {
  user: User;
  onUpgradeClick?: () => void;
}

// Simple in-memory global to persist bookings during session for testing "occupied" logic
// Key format: "barberId-YYYY-MM-DD-HH:mm"
const GLOBAL_BOOKED_SLOTS = new Set<string>();

// Track new appointments made in this session to enforce logic without backend
import {
  createAppointment,
  getAppointmentsByBarber,
} from '../actions/appointment/appointment.actions';
import { getBarbers } from '../actions/users/barber.actions';
import { getPlans } from '../actions/services/plan.actions';
import { getServices } from '../actions/services/service.actions';
// const SESSION_APPOINTMENTS: { clientId: string; date: string }[] = [];

const ClienteApp: React.FC<ClienteAppProps> = ({ user, onUpgradeClick }) => {
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
  const [paymentMethod, setPaymentMethod] = useState<
    'CREDIT' | 'DEBIT' | 'PIX' | null
  >(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPremiumRestriction, setShowPremiumRestriction] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(
    null,
  );
  const [showPremiumBanner, setShowPremiumBanner] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Initialize showPremiumBanner from sessionStorage
  React.useEffect(() => {
    // console.log('DEBUG: User Plan:', user.plan);
    if (user.plan === UserPlan.START) {
      const bannerHidden = sessionStorage.getItem(
        `premiumBannerHidden_${user.id}`,
      );
      if (!bannerHidden) {
        setShowPremiumBanner(true);
      }
    }
  }, [user.plan, user.id]);

  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [barbers, setBarbers] = useState<Barbeiro[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Fetch Barbers
  React.useEffect(() => {
    async function fetchBarbers() {
      const result = await getBarbers();
      if (result.success && result.barbers) {
        setBarbers(result.barbers);
      }
    }
    fetchBarbers();

    async function fetchPlans() {
      const result = await getPlans();
      if (result.success && result.plans) {
        setPlans(result.plans);
      }
    }
    fetchPlans();

    async function fetchServices() {
      const result = await getServices();
      if (result.success && result.services) {
        setServices(result.services);
      }
    }
    fetchServices();

    // Check for Stripe Success
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        setIsSuccess(true);
        // Default to CREDIT/Card visual if not found, but try to restore
        setPaymentMethod('CREDIT');

        const saved = sessionStorage.getItem('pendingBooking');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.barber) setSelectedBarber(parsed.barber);
            if (parsed.services) setSelectedServices(parsed.services);
            if (parsed.date) setSelectedDateStr(parsed.date);
            if (parsed.time) setSelectedTime(parsed.time);
            if (parsed.method) setPaymentMethod(parsed.method);

            // Optional: clear storage so it doesn't persist if they navigate away and back
            sessionStorage.removeItem('pendingBooking');
          } catch (e) {
            console.error('Failed to parse pending booking', e);
          }
        }
      }
    }
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
    // Adjust local dates if needed, keeping simple loop for now

    // Barber Limits
    let startDateLimit: Date | null = null;
    let endDateLimit: Date | null = null;

    if (
      selectedBarber &&
      selectedBarber.workStartDate &&
      selectedBarber.workStartDate.trim() !== ''
    ) {
      const parts = selectedBarber.workStartDate.split('-');
      if (parts.length === 3) {
        startDateLimit = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          0,
          0,
          0,
        );
      }
    }
    if (
      selectedBarber &&
      selectedBarber.workEndDate &&
      selectedBarber.workEndDate.trim() !== ''
    ) {
      const parts = selectedBarber.workEndDate.split('-');
      if (parts.length === 3) {
        endDateLimit = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          23,
          59,
          59,
        );
      }
    }

    // Default 14 days or longer if needed, let's keep 14 for visibility but respect limits
    // Actually, if a specific range is set, we might want to show that range?
    // For now, let's just stick to "Next 14 days" but filter out if outside range.
    // Or if the start date is in the future, we should probably start FROM there.

    let loopStart = new Date(); // Start from today
    // Reset time to start of day for accurate comparison
    loopStart.setHours(0, 0, 0, 0);

    // If startDateLimit is in the future, start from there.
    // If startDateLimit is valid and AFTER loopStart, update loopStart.
    // Make sure we don't start in the past just because limit is in the past (unless user wants to see past? No, only future generally)
    if (startDateLimit && startDateLimit > loopStart) {
      loopStart = new Date(startDateLimit);
    }

    // Safety: If limit is in the past and strict, we might show nothing?
    // Usually valid range is future. If start limit is past, valid range is today...limitEnd.

    for (let i = 0; i < 7; i++) {
      const date = new Date(loopStart);
      date.setDate(loopStart.getDate() + i);

      // Adjust to local ISO string
      const d = new Date(date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const fullDate = d.toISOString().split('T')[0];

      // Re-check strict limits if needed, but loopStart/end logic above helps.
      // It's safer to compare fullDate strings or timestamps.

      // FILTER FOR OFF DAYS
      const isOffDay = selectedBarber?.offDays?.includes(fullDate);
      if (isOffDay) continue;

      dates.push({
        fullDate,
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
  }, [selectedBarber]); // Add selectedBarber to dependency

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
    if (selectedBarber && selectedTime) {
      const dateTimeStr = `${selectedDateStr}T${selectedTime}:00`;

      // 1. Create Appointment
      const result = await createAppointment({
        clientId: user.id,
        barberId: selectedBarber.id,
        date: dateTimeStr,
        serviceIds: selectedServices.map((s) => s.id),
      });

      if (result.success && result.appointment) {
        // Premium Flow: Bypass Payment
        if (user.plan === UserPlan.PREMIUM) {
          setIsSuccess(true);
          // We use a custom string or cast to any to allow 'PREMIUM' for logic,
          // or just set CREDIT to show success message, but let's be explicit if we change the UI.
          // For now, let's reuse 'CREDIT' but we will add a check in the success view
          // OR better: Update the paymentMethod type locally or just use a state flag.
          // Let's force it to 'CREDIT' to ensure the UI shows "Confirmed" but we will add a text override in the UI code if plan is premium.
          setPaymentMethod('CREDIT');
          return;
        }

        // 2. Handle Payment (Standard Flow)
        // 2. Handle Payment (Standard Flow)
        // Save booking details to storage for success page
        sessionStorage.setItem(
          'pendingBooking',
          JSON.stringify({
            barber: selectedBarber,
            services: selectedServices,
            date: selectedDateStr,
            time: selectedTime,
            method: paymentMethod,
          }),
        );

        // Create InfinitePay Checkout
        const { createInfinitePayCheckout } =
          await import('../actions/payment/infinitepay.actions');

        const infinitePayResult = await createInfinitePayCheckout({
          appointmentId: result.appointment.id,
          services: selectedServices,
          userId: user.id,
          customer: {
            name: user.name,
            email: user.email || '',
            phone: user.whatsapp || '',
          },
        });

        if (infinitePayResult.success && infinitePayResult.url) {
          window.location.href = infinitePayResult.url;
          return;
        } else {
          alert(
            infinitePayResult.message ||
              'Erro ao iniciar pagamento com InfinitePay.',
          );
        }
        /*
        // Success marked directly for deactivation bypassing redirection
        setIsSuccess(true);
        if (paymentMethod) {
            setPaymentMethod(paymentMethod); // Visual state sync
        }
        if (paymentMethod === 'PIX') {
          // PIX: Use AbacatePay
          const paymentResult = await createAbacateBilling({
            appointmentId: result.appointment.id,
            services: selectedServices,
            userId: user.id,
            method: 'PIX',
          });

          if (paymentResult.success && paymentResult.url) {
            window.location.href = paymentResult.url;
            return;
          } else {
            alert(paymentResult.message || 'Erro ao iniciar pagamento Pix.');
          }
        } else if (paymentMethod === 'CREDIT' || paymentMethod === 'DEBIT') {
          // CARD: Use Stripe Checkout
          // Ensure we import createCheckoutSession
          const { createCheckoutSession } = await import(
            '../actions/stripe.actions'
          );

          const stripeResult = await createCheckoutSession({
            appointmentId: result.appointment.id,
            services: selectedServices,
            userId: user.id,
            paymentMethodTypes: ['card'], // Stripe Card covers Credit and Debit
          });

          if (stripeResult && stripeResult.success && stripeResult.url) {
            window.location.href = stripeResult.url;
            return;
          } else {
            alert(
              stripeResult.message || 'Erro ao iniciar pagamento com Cartão.',
            );
          }
        }
        */
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
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Tudo Pronto!
          </h2>
          <p className="text-neutral-400">
            Agendamento para {selectedDateObj?.dayName},{' '}
            {selectedDateObj?.dayNum} de {selectedDateObj?.month} às{' '}
            {selectedTime}.
          </p>
          {(paymentMethod === 'CREDIT' ||
            paymentMethod === 'DEBIT' ||
            paymentMethod === 'PIX') && (
            <p className="text-amber-500 font-bold text-sm">
              {user.plan === UserPlan.PREMIUM
                ? 'Agendamento Premium Confirmado.'
                : 'Pagamento Online Confirmado.'}
            </p>
          )}
        </div>

        {/* Removed QR Code logic for now as it is handled by Stripe */}

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
            {user.image ||
            (user.whatsapp && user.whatsapp.startsWith('data:image')) ? (
              <img
                src={user.image || user.whatsapp}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={40} className="text-neutral-600" />
            )}
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
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
              <h4 className="text-xl md:text-2xl font-display font-bold text-amber-500">
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
                  className="
    md:py-2 md:px-2
    transition-all
    group relative
    flex flex-col items-center text-center
    space-y-2 md:space-y-4"
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
                    <h5 className="font-bold text-base md:text-lg group-hover:text-amber-500 transition-colors">
                      {b.nome}
                    </h5>
                    <p className="text-neutral-500 text-[10px] mt-1 uppercase tracking-widest font-bold">
                      Especialista em Estilo
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Maintenance Card for Premium Subscriptions */}
            {/* Premium Upgrade Banner for Start Plan */}
            {user.plan === UserPlan.START && showPremiumBanner && (
              <div
                onClick={() =>
                  onUpgradeClick
                    ? onUpgradeClick()
                    : setShowMaintenanceModal(true)
                }
                className="fixed bottom-20 left-0 right-0 md:left-64 mx-auto w-fit max-w-[90%] md:max-w-md bg-gradient-to-r from-amber-600 to-amber-400 p-2.5 px-4 rounded-[1.5rem] shadow-2xl shadow-amber-500/20 flex items-center justify-between gap-3 group cursor-pointer hover:scale-[1.02] transition-transform z-40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <Sparkles className="text-black w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-black font-bold text-xs leading-none">
                      Seja Premium!
                    </p>
                    <p className="text-black/80 text-[8px] md:text-[9px] font-bold uppercase tracking-wider mt-0.5">
                      Cortes ilimitados por R$ 150
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 border-l border-black/10 pl-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPremiumBanner(false);
                      sessionStorage.setItem(
                        `premiumBannerHidden_${user.id}`,
                        'true',
                      );
                    }}
                    className="bg-black/10 p-1 rounded-full hover:bg-black/20 transition-colors"
                  >
                    <X size={14} className="text-black" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Modal */}
        {showMaintenanceModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400"></div>

              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Sparkles className="text-amber-500 w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold text-white">
                  Estamos melhorando!
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  As assinaturas Premium estão temporariamente desabilitadas
                  para manutenção do sistema de pagamentos.
                </p>
                <p className="text-amber-500 text-xs font-bold pt-2">
                  Voltaremos em breve com novidades!
                </p>
              </div>

              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-colors shadow-lg active:scale-95"
              >
                Entendi
              </button>
            </div>
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
                <h4 className="text-xl md:text-2xl font-display font-bold text-amber-500">
                  Selecione os Serviços
                </h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                  Com {selectedBarber?.nome}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {services.map((s) => {
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
                        className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-neutral-700'
                        }`}
                      >
                        {isSelected && (
                          <Check size={12} className="text-black font-bold" />
                        )}
                      </div>
                      <p className="font-bold text-base md:text-lg">{s.name}</p>
                    </div>
                    <p
                      className={`font-bold text-lg md:text-xl transition-colors ${
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
              <h4 className="text-xl md:text-2xl font-display font-bold text-amber-500 text-center">
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
                        className={`snap-center flex-shrink-0 w-14 md:w-16 py-2 md:py-3 rounded-2xl flex flex-col items-center border transition-all ${
                          isDisabled
                            ? 'opacity-10 grayscale cursor-not-allowed border-transparent'
                            : isSelected
                              ? 'bg-amber-500 border-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-[8px] md:text-[9px] uppercase font-bold opacity-60">
                          {date.dayName}
                        </span>
                        <span className="text-base md:text-lg font-bold">
                          {date.dayNum}
                        </span>
                        <span className="text-[8px] md:text-[9px] uppercase font-bold opacity-60">
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
                {(() => {
                  const slots: string[] = [];
                  if (selectedBarber) {
                    const startHr = parseInt(
                      selectedBarber.horariosTrabalho.inicio.split(':')[0],
                    );
                    const startMin = parseInt(
                      selectedBarber.horariosTrabalho.inicio.split(':')[1] ||
                        '0',
                    );
                    const endHr = parseInt(
                      selectedBarber.horariosTrabalho.fim.split(':')[0],
                    );
                    const endMin = parseInt(
                      selectedBarber.horariosTrabalho.fim.split(':')[1] || '0',
                    );
                    const interval = selectedBarber.intervaloAtendimento || 10; // Minutes

                    let current = new Date();
                    current.setHours(startHr, startMin, 0, 0);

                    const end = new Date();
                    end.setHours(endHr, endMin, 0, 0);

                    while (current < end) {
                      const timeStr = current.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });
                      slots.push(timeStr);
                      current.setMinutes(current.getMinutes() + interval);
                    }
                  } else {
                    // Fallback if no barber selected (shouldn't happen here)
                    const startHr = 9;
                    const endHr = 18;
                    const interval = 10;

                    let current = new Date();
                    current.setHours(startHr, 0, 0, 0);
                    const end = new Date();
                    end.setHours(endHr, 0, 0, 0);

                    while (current < end) {
                      const timeStr = current.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });
                      slots.push(timeStr);
                      current.setMinutes(current.getMinutes() + interval);
                    }
                  }

                  return slots
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
                          className={`py-3 md:py-4 rounded-2xl border text-xs md:text-sm font-bold transition-all ${
                            occupied
                              ? 'bg-neutral-800 border-neutral-700 text-neutral-700 line-through cursor-not-allowed'
                              : selectedTime === time
                                ? 'bg-amber-500 border-amber-500 text-black scale-105 shadow-lg shadow-amber-500/20'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                          }`}
                        >
                          {occupied ? 'Indisp.' : time}
                        </button>
                      );
                    });
                })()}
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
                onClick={() => setPaymentMethod('CREDIT')}
                className={`group relative flex flex-col items-center justify-center gap-6 p-8 rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${
                  paymentMethod === 'CREDIT'
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.2)] scale-[1.02]'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 hover:bg-neutral-800/80'
                }`}
              >
                {/* Background Glow */}
                {paymentMethod === 'CREDIT' && (
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>
                )}

                {/* Selected Indicator - Top Right */}
                <div
                  className={`absolute top-6 right-6 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-amber-500 border-amber-500 scale-100'
                      : 'border-neutral-700 scale-75 opacity-0'
                  }`}
                >
                  <Check
                    size={16}
                    className="text-black font-bold"
                    strokeWidth={4}
                  />
                </div>

                <div
                  className={`p-5 rounded-2xl transition-all duration-300 ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 rotate-[-4deg]'
                      : 'bg-neutral-800 text-neutral-400 group-hover:text-amber-500'
                  }`}
                >
                  <CreditCard size={32} strokeWidth={2.5} />
                </div>

                <div className="text-center space-y-4 w-full">
                  <p
                    className={`font-display font-bold text-2xl tracking-tight transition-colors ${
                      paymentMethod === 'CREDIT'
                        ? 'text-white'
                        : 'text-neutral-300'
                    }`}
                  >
                    Pagamento Integrado
                  </p>
                  <div className="flex justify-center">
                    <span
                      className={`text-[11px] uppercase font-black tracking-[0.25em] px-5 py-2.5 rounded-full border transition-all duration-500 ${
                        paymentMethod === 'CREDIT'
                          ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 text-amber-500 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                          : 'bg-neutral-800/50 text-amber-500/70 border-amber-500/20 hover:text-amber-500 hover:border-amber-500/40'
                      }`}
                    >
                      Crédito • Débito • Pix
                    </span>
                  </div>
                </div>
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
                Estr. Velha de Maricá - Inoã, Maricá - RJ, 24931-185
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteApp;
