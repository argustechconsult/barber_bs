
import React, { useState } from 'react';
import { User, UserRole, Appointment, Barbeiro } from '../types';
import { MOCK_APPOINTMENTS, MOCK_BARBERS } from '../constants';
import { Calendar as CalendarIcon, Clock, CheckCircle2, User as UserIcon, Filter, ChevronLeft, ChevronRight, Grid } from 'lucide-react';

interface BarberAgendaViewProps {
  user: User;
}

const BarberAgendaView: React.FC<BarberAgendaViewProps> = ({ user }) => {
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [selectedBarberId, setSelectedBarberId] = useState<string>(user.barbeiroId || MOCK_BARBERS[0].id);
  const isAdmin = user.role === UserRole.ADMIN;

  const filteredAppointments = isAdmin 
    ? MOCK_APPOINTMENTS.filter(ap => ap.barbeiroId === selectedBarberId)
    : MOCK_APPOINTMENTS.filter(ap => ap.barbeiroId === user.barbeiroId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-16 md:pt-0">
        <div>
          <h2 className="text-3xl font-display font-bold">Agenda de Atendimentos</h2>
          <p className="text-neutral-500">
            {isAdmin ? `Visualizando agenda de ${MOCK_BARBERS.find(b => b.id === selectedBarberId)?.nome}` : 'Seu fluxo diário de trabalho'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-neutral-900 p-1 rounded-2xl border border-neutral-800 flex">
            {(['day', 'week', 'month'] as const).map(type => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewType === type ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
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
                {MOCK_BARBERS.map(b => (
                  <option key={b.id} value={b.id} className="bg-neutral-900">{b.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* View Switcher Content */}
      <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-[3rem] shadow-2xl space-y-8">
        {viewType === 'day' ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((ap) => (
                <div key={ap.id} className="bg-neutral-950 border border-neutral-800 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center gap-6 group hover:border-amber-500/30 transition-all">
                  <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex flex-col items-center justify-center border border-white/5 shadow-xl">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Horário</span>
                    <span className="text-xl font-bold text-amber-500">10:00</span>
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="text-xl font-bold">{ap.clientName}</h4>
                      <span className="bg-neutral-900 text-neutral-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest self-center">Confirmado</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span className="text-xs">45 min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserIcon size={14} />
                        <span className="text-xs">Serviço: Degradê</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="bg-green-500 text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/10">
                      <CheckCircle2 size={18} /> Concluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <CalendarIcon size={48} className="text-neutral-800 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium">Sem agendamentos para hoje.</p>
              </div>
            )}
          </div>
        ) : viewType === 'week' ? (
          <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="min-w-[120px] bg-neutral-950 p-4 rounded-3xl border border-neutral-800 space-y-4">
                <p className="text-center font-bold text-xs uppercase text-neutral-500 border-b border-neutral-800 pb-2">{day}</p>
                <div className="space-y-2">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-500 font-bold">10:00 - Corte</div>
                  <div className="p-2 bg-white/5 border border-white/5 rounded-xl text-[10px] text-neutral-500 font-bold">14:30 - Barba</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({length: 31}).map((_, i) => (
              <div key={i} className="aspect-square bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center relative hover:border-amber-500/40 transition-colors cursor-pointer group">
                <span className="text-xs text-neutral-600 font-bold">{i + 1}</span>
                {i === 14 && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full"></div>}
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarberAgendaView;
