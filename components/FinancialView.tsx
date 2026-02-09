import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserPlan } from '../types';
import {
  Download,
  CheckCircle,
  Clock,
  ReceiptText,
  ShieldCheck,
  CreditCard,
  QrCode,
  X,
  AlertCircle,
  Copy,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPlans } from '../actions/services/plan.actions';
import {
  createAsaasSubscription,
  syncUserAsaasStatus,
} from '../actions/payment/asaas.actions';
import { RefreshCw } from 'lucide-react';

interface FinancialViewProps {
  user: User;
  initialShowModal?: boolean;
}

import { generateInvoicePDF } from '../lib/invoice-generator';

const FinancialView: React.FC<FinancialViewProps> = ({
  user,
  initialShowModal = false,
}) => {
  const router = useRouter();
  const isPremium = user.plan === UserPlan.PREMIUM;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(initialShowModal);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [checkoutStep, setCheckoutStep] = useState<
    'selection' | 'info' | 'payment' | 'pix' | 'success'
  >('selection');
  const [billingType, setBillingType] = useState<'CREDIT_CARD' | 'PIX'>('PIX');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmingMessage, setConfirmingMessage] = useState(
    'Autenticando dados...',
  );

  // Form State
  const [formData, setFormData] = useState({
    cpfCnpj: user.cpfCnpj || '',
    phone: user.phone || user.whatsapp || '',
    postalCode: user.postalCode || '',
    address: user.address || '',
    addressNumber: user.addressNumber || '',
    addressComplement: user.addressComplement || '',
    province: user.province || '',
    city: user.city || '',
  });

  const [ccData, setCcData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  // Masks
  const maskCpfCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const maskNumber = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const maskCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const maskDatePart = (value: string, limit: number) => {
    return value.replace(/\D/g, '').slice(0, limit);
  };

  const maskName = (value: string) => {
    return value.toUpperCase();
  };

  useEffect(() => {
    if (isPremium) {
      import('../actions/users/barber.actions').then(
        ({ getFinancialStats }) => {
          getFinancialStats(user.id).then((res) => {
            if (res.success && res.stats?.transactions) {
              const subs = res.stats.transactions.filter(
                (t: any) =>
                  t.type === 'SUBSCRIPTION' ||
                  (t.description &&
                    t.description.toLowerCase().includes('mensalidade')),
              );
              setInvoices(subs);
            }
          });
        },
      );
    } else {
      getPlans().then((res) => {
        if (res.success && res.plans) {
          setPlans(res.plans);
        }
      });
    }
  }, [user.id, isPremium]);

  useEffect(() => {
    if (formData.postalCode.replace(/\D/g, '').length === 8) {
      handleCepLookup(formData.postalCode);
    }
  }, [formData.postalCode]);

  const handleCepLookup = async (cep: string) => {
    // Only fetching if we haven't lately or valid
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    // We can call server action
    try {
      const { getAddressByCep } =
        await import('../actions/services/melhor-envio.actions');
      const res = await getAddressByCep(cleanCep);
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          address: res.data!.street || prev.address,
          city: res.data!.city || prev.city,
          province: res.data!.state || prev.province, // Assuming province maps to state
          // neighborhood: res.data.neighborhood
        }));
      }
    } catch (e) {
      console.error('CEP lookup error', e);
    } finally {
      setCepLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    setLoading(true);
    setIsConfirming(true);
    setConfirmingMessage('Autenticando dados...');
    setError(null);

    // Dynamic messages
    const messageInterval = setInterval(() => {
      setConfirmingMessage((prev) => {
        if (prev === 'Autenticando dados...')
          return 'Validando com a operadora...';
        if (prev === 'Validando com a operadora...')
          return 'Finalizando assinatura...';
        return prev;
      });
    }, 2500);

    try {
      const result = await createAsaasSubscription({
        userId: user.id,
        planId: selectedPlan.id,
        billingType,
        customerInfo: formData,
        creditCard: billingType === 'CREDIT_CARD' ? ccData : undefined,
      });

      if (result.success) {
        setConfirmingMessage('Configurando seu acesso Premium...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        clearInterval(messageInterval);

        if (billingType === 'PIX' && result.pix) {
          setPixData(result.pix);
          setCheckoutStep('pix');
          setIsConfirming(false);
        } else {
          router.push(
            `/payment/success?type=subscription&amount=${result.amount}&expirationDate=${result.expirationDate}`,
          );
        }
      } else {
        clearInterval(messageInterval);
        setIsConfirming(false);
        setError(result.message || 'Erro ao criar assinatura');
      }
    } catch (err: any) {
      clearInterval(messageInterval);
      setIsConfirming(false);
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await syncUserAsaasStatus(user.id);
      if (res.success) {
        alert('Status sincronizado com sucesso!');
        window.location.reload(); // Simple reload to refresh all data
      } else {
        setError(res.message || 'Erro ao sincronizar status');
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado ao sincronizar');
    } finally {
      setLoading(false);
    }
  };

  const copyPixPayload = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      alert('Copiado!');
    }
  };

  const lastRenewalDate = user.lastRenewal
    ? typeof user.lastRenewal === 'string'
      ? parseISO(user.lastRenewal)
      : new Date(user.lastRenewal)
    : new Date();
  const nextRenewalDate = addMonths(lastRenewalDate, 1);

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="text-center pt-4">
        <h2 className="text-3xl font-display font-bold">Financeiro</h2>
        <p className="text-neutral-500 mt-2">Seus planos e faturas</p>
      </header>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div
          className={`p-8 ${
            isPremium ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-white'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  isPremium ? 'text-black/60' : 'text-neutral-400'
                }`}
              >
                Plano Atual
              </p>
              <h3 className="text-3xl font-display font-bold">
                {isPremium ? 'Plano VIP' : 'Start'}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={loading}
                className={`p-3 rounded-2xl transition-all ${
                  isPremium
                    ? 'bg-black/10 hover:bg-black/20 text-black'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                } ${loading ? 'animate-spin' : ''}`}
                title="Sincronizar status com Asaas"
              >
                <RefreshCw size={24} />
              </button>
              <div
                className={`p-3 rounded-2xl ${
                  isPremium ? 'bg-black/10' : 'bg-neutral-900'
                }`}
              >
                <ShieldCheck size={24} />
              </div>
            </div>
          </div>
          <p
            className={`text-sm font-medium ${
              isPremium ? 'text-black/80' : 'text-neutral-400'
            }`}
          >
            {isPremium
              ? 'Acesso total ilimitado de Segunda a Sexta'
              : 'Pagamento por serviço individual'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {isPremium ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Próxima Renovação
                    </p>
                    <p className="text-sm font-bold">
                      {format(nextRenewalDate, "d 'de' MMMM, yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-amber-500 font-bold">R$ 150</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Minhas Faturas
                </h4>
                <div className="space-y-3">
                  {invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-800 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/10 p-2 rounded-xl">
                            <ReceiptText className="text-amber-500" size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {invoice.description ||
                                'Assinatura Plano VIP - Inicial'}
                            </p>
                            <p className="text-[10px] text-neutral-500 font-medium">
                              Pago em{' '}
                              {invoice.date
                                ? format(parseISO(invoice.date), 'dd/MM/yyyy')
                                : '08/02/2026'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            generateInvoicePDF({
                              clientName: user.name,
                              clientEmail: user.email || 'Não informado',
                              clientPhone:
                                user.phone || user.whatsapp || 'Não informado',
                              planName:
                                invoice.description ||
                                'Assinatura Plano VIP - Inicial',
                              amount: invoice.amount || 150.0,
                              paymentDate: invoice.date
                                ? format(parseISO(invoice.date), 'dd/MM/yyyy')
                                : '08/02/2026',
                              invoiceNumber: invoice.id
                                .split('-')[0]
                                .toUpperCase(),
                            });
                          }}
                          className="group relative flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                        >
                          <Download size={16} />
                          <span className="text-[10px] uppercase tracking-wider">
                            Baixar PDF
                          </span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      Nenhuma fatura encontrada.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem]">
                <Clock className="text-amber-500 mx-auto mb-4" size={32} />
                <h4 className="font-bold text-lg mb-2">
                  Ainda não é mensalista?
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  No plano Start você paga apenas pelo que consome. Migre para o
                  Premium e tenha cortes ilimitados todo mês!
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full bg-amber-500 text-black font-bold py-4 rounded-3xl shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 hover:bg-amber-400 transition-all"
              >
                Ver Planos Premium <CheckCircle size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 space-y-8 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold">
                {checkoutStep === 'selection' && 'Escolha seu Plano'}
                {checkoutStep === 'info' && 'Seus Dados'}
                {checkoutStep === 'payment' && 'Dados do Cartão'}
                {checkoutStep === 'success' && 'Assinatura Criada!'}
                {checkoutStep === 'pix' && 'Pague com Pix'}
              </h3>
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  setCheckoutStep('selection');
                  setError(null);
                }}
                className="p-2 hover:bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {checkoutStep === 'selection' && (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setCheckoutStep('info');
                    }}
                    className="w-full p-6 bg-neutral-800/50 border border-neutral-700 rounded-3xl text-left hover:border-amber-500 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xl font-bold group-hover:text-amber-500">
                        {plan.name}
                      </h4>
                      <span className="text-2xl font-bold text-amber-500">
                        R$ {plan.price}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-400">
                      Mensal • Cortes Ilimitados
                    </p>
                  </button>
                ))}
                {plans.length === 0 && (
                  <p className="text-center text-neutral-500">
                    Buscando planos disponíveis...
                  </p>
                )}
              </div>
            )}

            {checkoutStep === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      CPF/CNPJ
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={formData.cpfCnpj}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpfCnpj: maskCpfCnpj(e.target.value),
                        })
                      }
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      WhatsApp
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone: maskPhone(e.target.value),
                        })
                      }
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      CEP
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={formData.postalCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          postalCode: maskCep(e.target.value),
                        })
                      }
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      Endereço
                    </label>
                    <input
                      className={`w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500 ${cepLoading ? 'animate-pulse' : ''}`}
                      value={cepLoading ? 'Buscando...' : formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Rua, Av..."
                      readOnly={cepLoading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      Número
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={formData.addressNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addressNumber: maskNumber(e.target.value),
                        })
                      }
                      placeholder="123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      Cidade
                    </label>
                    <input
                      className={`w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500 ${cepLoading ? 'animate-pulse' : ''}`}
                      value={cepLoading ? 'Buscando...' : formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="São Paulo"
                      readOnly={cepLoading}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2 mb-4">
                    Forma de Pagamento
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setBillingType('PIX')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${billingType === 'PIX' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'border-neutral-800 text-neutral-500'}`}
                    >
                      <QrCode size={24} />
                      <span className="text-[10px] font-bold">
                        PIX AUTOMÁTICO
                      </span>
                    </button>
                    <button
                      onClick={() => setBillingType('CREDIT_CARD')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${billingType === 'CREDIT_CARD' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'border-neutral-800 text-neutral-500'}`}
                    >
                      <CreditCard size={24} />
                      <span className="text-[10px] font-bold">
                        CARTÃO DE CRÉDITO
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() =>
                    billingType === 'CREDIT_CARD'
                      ? setCheckoutStep('payment')
                      : handleCreateSubscription()
                  }
                  disabled={loading}
                  className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? 'Próximo...' : 'Continuar'}
                </button>
              </div>
            )}

            {checkoutStep === 'payment' && billingType === 'CREDIT_CARD' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                    Nome no Cartão
                  </label>
                  <input
                    className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                    value={ccData.holderName}
                    onChange={(e) =>
                      setCcData({
                        ...ccData,
                        holderName: maskName(e.target.value),
                      })
                    }
                    placeholder="JOAO DA SILVA"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                    Número do Cartão
                  </label>
                  <input
                    className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                    value={ccData.number}
                    onChange={(e) =>
                      setCcData({
                        ...ccData,
                        number: maskCardNumber(e.target.value),
                      })
                    }
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      Mês
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={ccData.expiryMonth}
                      onChange={(e) =>
                        setCcData({
                          ...ccData,
                          expiryMonth: maskDatePart(e.target.value, 2),
                        })
                      }
                      placeholder="MM"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      Ano
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={ccData.expiryYear}
                      onChange={(e) =>
                        setCcData({
                          ...ccData,
                          expiryYear: maskDatePart(e.target.value, 4),
                        })
                      }
                      placeholder="AAAA"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pl-2">
                      CVV
                    </label>
                    <input
                      className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-3.5 outline-none focus:border-amber-500"
                      value={ccData.ccv}
                      onChange={(e) =>
                        setCcData({
                          ...ccData,
                          ccv: maskDatePart(e.target.value, 4),
                        })
                      }
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateSubscription}
                  disabled={loading}
                  className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processando...' : 'Confirmar Assinatura'}
                </button>
                <button
                  onClick={() => setCheckoutStep('info')}
                  className="w-full text-neutral-500 text-xs font-bold uppercase tracking-widest"
                >
                  Voltar
                </button>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-10 space-y-6">
                <CheckCircle className="text-green-500 mx-auto w-20 h-20" />
                <div>
                  <h4 className="text-2xl font-bold">Tudo pronto!</h4>
                  <p className="text-neutral-500 mt-2">
                    Sua assinatura foi criada com sucesso e está sendo
                    processada.
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="w-full bg-neutral-800 py-4 rounded-2xl font-bold"
                >
                  Fechar
                </button>
              </div>
            )}

            {checkoutStep === 'pix' && pixData && (
              <div className="text-center space-y-6">
                <p className="text-sm text-neutral-400">
                  Escaneie o código abaixo para ativar sua assinatura Premium.
                </p>
                <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto flex items-center justify-center shadow-2xl">
                  {pixData.encodedImage ? (
                    <img
                      src={`data:image/png;base64,${pixData.encodedImage}`}
                      alt="Pix QR Code"
                    />
                  ) : (
                    <QrCode size={100} className="text-black" />
                  )}
                </div>
                <div className="space-y-4">
                  <button
                    onClick={copyPixPayload}
                    className="w-full bg-neutral-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-700 transition-all"
                  >
                    <Copy size={18} /> Copiar Código Pix
                  </button>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest animate-pulse">
                    Aguardando confirmação de pagamento...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirming Subscription Overlay */}
      {isConfirming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-neutral-900 border border-white/10 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-[0_0_100px_rgba(245,158,11,0.15)] animate-in zoom-in-95 duration-500 relative overflow-hidden">
            {/* Amber Glow Effects */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 blur-[100px]"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px]"></div>

            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)] border-4 border-black animate-pulse">
                <Loader2 className="text-black w-12 h-12 animate-spin-slow" />
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-display font-black tracking-tight text-white uppercase italic">
                  Confirmando Assinatura
                </h3>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                    <p className="text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
                      Processando sua solicitação
                    </p>
                  </div>
                  <p className="text-neutral-400 text-sm font-medium animate-pulse h-5 transition-all">
                    {confirmingMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.3em]">
                Stayler © All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialView;
