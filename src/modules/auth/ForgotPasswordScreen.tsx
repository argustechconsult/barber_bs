'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { RecoveryIdentitySchema, RecoverPasswordSchema } from './auth.schema';
import { validateUserIdentity, updateUserPassword } from './auth.service';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<'identify' | 'reset'>('identify');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    return formatted.slice(0, 10);
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = RecoveryIdentitySchema.safeParse({ email, birthDate });
      if (!result.success) {
        setError(result.error.issues[0].message);
        setIsPending(false);
        return;
      }

      const response = await validateUserIdentity(
        email.toLowerCase(),
        birthDate,
      );
      if (response.success) {
        setStep('reset');
      } else {
        setError(response.message || 'Dados inválidos.');
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsPending(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = RecoverPasswordSchema.safeParse({
        email,
        birthDate,
        password,
        confirmPassword,
      });
      if (!result.success) {
        setError(result.error.issues[0].message);
        setIsPending(false);
        return;
      }

      const response = await updateUserPassword(
        email.toLowerCase(),
        birthDate,
        password,
      );
      if (response.success) {
        setIsSuccess(true);
      } else {
        setError(response.message || 'Erro ao atualizar senha.');
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full -mr-64 -mt-64 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full -ml-48 -mb-48 blur-[100px]"></div>

        <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-neutral-800 shadow-2xl text-center space-y-5 md:space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-lg shadow-green-500/5">
            <CheckCircle2 className="text-green-500 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white">
              Senha Alterada!
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Sua senha foi atualizada com sucesso. Você já pode acessar sua
              conta.
            </p>
          </div>
          <button
            onClick={onBackToLogin}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-start md:items-center justify-center p-2 pt-12 md:p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full -mr-64 -mt-64 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full -ml-48 -mb-48 blur-[100px]"></div>

      <div className="w-full max-w-md space-y-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto border border-neutral-800 shadow-xl mb-4 group hover:border-amber-500/50 transition-colors duration-500">
            <Sparkles className="text-amber-500 w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            {step === 'identify' ? 'Recuperar Senha' : 'Nova Senha'}
          </h1>
          <p className="text-neutral-500 text-sm font-medium uppercase tracking-[0.2em]">
            Padrão Premium Stayler
          </p>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-neutral-800 shadow-2xl space-y-5 md:space-y-6">
          <button
            onClick={
              step === 'identify' ? onBackToLogin : () => setStep('identify')
            }
            className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-1 transition-transform"
            />
            {step === 'identify'
              ? 'Voltar para o login'
              : 'Voltar para identificação'}
          </button>

          <p className="text-neutral-400 text-sm leading-relaxed">
            {step === 'identify'
              ? 'Insira seus dados cadastrados para validar sua identidade.'
              : 'Agora escolha uma nova senha segura para sua conta.'}
          </p>

          <form
            onSubmit={
              step === 'identify' ? handleIdentitySubmit : handleResetSubmit
            }
            className="space-y-5"
          >
            {step === 'identify' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block ml-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-500 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@e-mail.com"
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-white pl-11 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-700 text-sm md:text-base"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block ml-1">
                    Data de Nascimento
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-500 transition-colors">
                      <Calendar size={18} />
                    </div>
                    <input
                      type="text"
                      value={birthDate}
                      onChange={(e) =>
                        setBirthDate(formatBirthDate(e.target.value))
                      }
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-white pl-11 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-700 text-sm md:text-base"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block ml-1">
                    Nova Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-white pl-11 pr-12 py-3.5 md:py-4 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-700 text-sm md:text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-600 hover:text-neutral-400"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block ml-1">
                    Confirmar Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-white pl-11 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-700 text-sm md:text-base"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3 items-center animate-in shake duration-300">
                <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                <p className="text-red-500 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black py-4 md:py-5 rounded-xl md:rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden text-sm md:text-base"
            >
              <span className="relative z-10">
                {isPending
                  ? 'PROCESSANDO...'
                  : step === 'identify'
                    ? 'VALIDAR IDENTIDADE'
                    : 'REDEFINIR SENHA AGORA'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-[0.3em]">
            NinjaService Security System
          </p>
        </div>
      </div>
    </div>
  );
}
