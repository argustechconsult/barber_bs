import React, { useState } from 'react';
import { User, UserRole, Appointment, Barbeiro } from '../types';
import { getBarberSchedule } from '../actions/appointment/appointment.actions';
import {
  getBarbers,
  updateBarberSettings,
} from '../actions/users/barber.actions';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  CalendarCheck,
  User as UserIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
} from 'lucide-react';

interface BarberAgendaViewProps {
  user: User;
}

const BarberAgendaView: React.FC<BarberAgendaViewProps> = ({ user }) => {
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    user.role === UserRole.BARBEIRO ? user.id : user.barbeiroId || '',
  );
  const isAdmin = user.role === UserRole.ADMIN;

  // Real State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<Barbeiro[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats/Settings State for the selected barber
  const [appointmentInterval, setAppointmentInterval] = useState<number>(10);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [offDays, setOffDays] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch initial data
  React.useEffect(() => {
    async function loadData() {
      const resBarbers = await getBarbers();
      if (resBarbers.success && resBarbers.barbers) {
        setBarbers(resBarbers.barbers);

        // Find current selected barber to initialize settings
        const currentBarberId = isAdmin
          ? selectedBarberId || user.barbeiroId || resBarbers.barbers[0]?.id
          : user.id;

        if (isAdmin && !selectedBarberId && resBarbers.barbers.length > 0) {
          setSelectedBarberId(currentBarberId);
        }

        const barber = resBarbers.barbers.find((b) => b.id === currentBarberId);
        if (barber) {
          setAppointmentInterval(barber.intervaloAtendimento);
          setStartTime(barber.horariosTrabalho.inicio);
          setEndTime(barber.horariosTrabalho.fim);
          setOffDays(barber.offDays || []);
        }
      }
    }
    loadData();
  }, [isAdmin, user.barbeiroId]);

  // Sync settings when selectedBarberId changes (for Admin)
  React.useEffect(() => {
    if (isAdmin && selectedBarberId) {
      const barber = barbers.find((b) => b.id === selectedBarberId);
      if (barber) {
        setAppointmentInterval(barber.intervaloAtendimento);
        setStartTime(barber.horariosTrabalho.inicio);
        setEndTime(barber.horariosTrabalho.fim);
        setOffDays(barber.offDays || []);
      }
    }
  }, [selectedBarberId, barbers, isAdmin]);

  // Fetch appointments
  React.useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      const barberId = isAdmin
        ? selectedBarberId
        : user.role === UserRole.BARBEIRO
          ? user.id
          : user.barbeiroId;

      if (!barberId) {
        setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const res = await getBarberSchedule(barberId, todayStr);
      if (res.success && res.appointments) {
        setAppointments(
          res.appointments.map((a) => ({
            id: a.id,
            clientName: a.client.name,
            date: a.date,
            barbeiroId: a.barberId,
            status: a.status,
          })),
        );
      } else {
        setAppointments([]);
      }
      setLoading(false);
    }
    fetchApps();
  }, [selectedBarberId, user.barbeiroId, isAdmin, viewType]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = isAdmin ? selectedBarberId : user.id;
    if (!targetId) return;

    const res = await updateBarberSettings(targetId, {
      interval: appointmentInterval,
      startTime,
      endTime,
      offDays,
    });

    if (res.success) {
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);

      // Update local barbers list to keep in sync
      setBarbers((prev) =>
        prev.map((b) =>
          b.id === targetId
            ? {
                ...b,
                intervaloAtendimento: appointmentInterval,
                horariosTrabalho: { inicio: startTime, fim: endTime },
                offDays,
              }
            : b,
        ),
      );
    } else {
      alert('Erro ao salvar configurações: ' + res.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-4 shadow-2xl scale-in-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/20">
              <CheckCircle2 className="text-green-500 w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">Configurações Salvas!</h3>
            <p className="text-neutral-400 text-sm">
              Sua agenda foi atualizada com sucesso e já está refletindo para os
              clientes.
            </p>
          </div>
        </div>
      )}

      {/* Barber Profile Header */}
      {!isAdmin && (
        <div className="flex flex-col items-center justify-center pt-4 pb-4 space-y-3">
          {(() => {
            const barber = barbers.find(
              (b) => b.id === (isAdmin ? selectedBarberId : user.id),
            );
            const name = barber?.nome || user.name;
            const photo = barber?.foto || user.image || user.whatsapp;

            return (
              <>
                <div className="w-32 h-32 rounded-full border-4 border-amber-500 p-1">
                  {photo && photo.startsWith('data:image') ? (
                    <img
                      src={photo}
                      alt={name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center">
                      <UserIcon size={48} className="text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-display font-bold text-white">
                  {name}
                </h2>
              </>
            );
          })()}
        </div>
      )}

      <header className="flex flex-col items-center text-center gap-6 pt-4 md:pt-0">
        <div>
          <h2 className="text-xl md:text-3xl font-display font-bold">
            Agenda de Atendimentos
          </h2>
          <p className="text-neutral-500 text-sm">
            {isAdmin
              ? `Visualizando agenda de ${
                  barbers.find((b) => b.id === selectedBarberId)?.nome || '...'
                }`
              : 'Seu fluxo diário de trabalho'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <div className="bg-neutral-900 p-1 rounded-2xl border border-neutral-800 flex">
            {(['day', 'week', 'month'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewType === type
                    ? 'bg-amber-500 text-black'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 bg-neutral-900 p-2 rounded-2xl border border-neutral-800">
              <Filter size={18} className="text-neutral-500 ml-2" />
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-amber-500 focus:ring-0 cursor-pointer"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id} className="bg-neutral-900">
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* View Switcher Content */}
      <div className="bg-neutral-900/50 border border-neutral-800 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl space-y-8">
        {viewType === 'day' ? (
          <div className="grid grid-cols-1 gap-4">
            {appointments.length > 0 ? (
              appointments.map((ap) => {
                const time = new Date(ap.date).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={ap.id}
                    className="bg-neutral-950 border border-neutral-800 p-4 md:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center gap-4 md:gap-6 group hover:border-amber-500/30 transition-all"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-neutral-900 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center border border-white/5 shadow-xl">
                      <span className="text-[8px] md:text-[10px] font-bold text-neutral-500 uppercase">
                        Horário
                      </span>
                      <span className="text-lg md:text-xl font-bold text-amber-500">
                        {time}
                      </span>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-2">
                        <h4 className="text-lg md:text-xl font-bold">
                          {ap.clientName}
                        </h4>
                        <span className="bg-neutral-900 text-neutral-500 text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest self-center">
                          {ap.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span className="text-xs">
                            Intervalo: {appointmentInterval} min
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon size={14} />
                          <span className="text-xs">Serviço: Agendado</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none bg-green-500 text-black px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/10 text-sm">
                        <CheckCircle2
                          size={16}
                          className="md:w-[18px] md:h-[18px]"
                        />{' '}
                        Concluir
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <CalendarIcon
                  size={48}
                  className="text-neutral-800 mx-auto mb-4"
                />
                <p className="text-neutral-500 font-medium">
                  Sem agendamentos para hoje.
                </p>
              </div>
            )}
          </div>
        ) : viewType === 'week' ? (
          <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
              <div
                key={day}
                className="min-w-[120px] bg-neutral-950 p-4 rounded-3xl border border-neutral-800 space-y-4"
              >
                <p className="text-center font-bold text-xs uppercase text-neutral-500 border-b border-neutral-800 pb-2">
                  {day}
                </p>
                <div className="space-y-2 text-center text-[10px] text-neutral-600 font-medium italic">
                  Visualização semanal em breve
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center relative hover:border-amber-500/40 transition-colors cursor-pointer group"
              >
                <span className="text-xs text-neutral-600 font-bold">
                  {i + 1}
                </span>
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agenda Configuration Section - Same as Admin for standard barber too */}
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] space-y-8 shadow-xl animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
            <CalendarCheck size={24} />
          </div>
          <h3 className="text-xl font-bold">Configuração de Agenda</h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-2">
              Intervalo entre atendimentos (minutos)
            </label>
            <div className="relative">
              <select
                value={appointmentInterval}
                onChange={(e) => setAppointmentInterval(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40 appearance-none text-white"
              >
                {Array.from({ length: 10 }).map((_, i) => {
                  const val = 10 + i * 5;
                  return (
                    <option key={val} value={val} className="bg-neutral-900">
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
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40 appearance-none text-white"
                >
                  {Array.from({ length: 96 }).map((_, i) => {
                    const totalMins = i * 15;
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    const time = `${h.toString().padStart(2, '0')}:${m
                      .toString()
                      .padStart(2, '0')}`;
                    return (
                      <option
                        key={time}
                        value={time}
                        className="bg-neutral-900"
                      >
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
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/40 appearance-none text-white"
                >
                  {Array.from({ length: 96 }).map((_, i) => {
                    const totalMins = i * 15;
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    const time = `${h.toString().padStart(2, '0')}:${m
                      .toString()
                      .padStart(2, '0')}`;
                    return (
                      <option
                        key={time}
                        value={time}
                        className="bg-neutral-900"
                      >
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
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
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
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
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
                              ${
                                isOff
                                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                  : 'text-neutral-500 hover:bg-white/5'
                              }
                            `}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 text-center italic">
              Clique nas datas para marcar sua folga
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl hover:bg-amber-400 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10"
          >
            Salvar Agenda
          </button>
        </form>
      </div>
    </div>
  );
};

export default BarberAgendaView;
