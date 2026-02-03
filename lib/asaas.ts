async function asaasFetch(endpoint: string, options: RequestInit = {}) {
  // Debug Logging
  const envKeys = Object.keys(process.env).filter(k => k.includes('ASAAS'));
  const rawKey = process.env.ASAAS_API_KEY;
  
  console.log('--- ASAAS DEBUG ---');
  console.log('Detected Env Keys:', envKeys);
  console.log('Raw Key Type:', typeof rawKey);
  console.log('Raw Key Length:', rawKey?.length);
  console.log('Raw Key Start:', rawKey?.substring(0, 5));
  console.log('-------------------');
  
  const apiKey = rawKey;
  const baseUrl = process.env.ASAAS_BASE_URL?.replace('/payments', '') || 'https://api-sandbox.asaas.com/v3';

  if (!apiKey || apiKey.trim() === '') {
    console.error('ASAAS_API_KEY is missing or empty.');
    throw new Error(`Configuração inválida: ASAAS_API_KEY vazia ou não encontrada. (Len: ${apiKey?.length})`);
  }

  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Asaas Error] ${endpoint}:`, JSON.stringify(data, null, 2));
    throw new Error(data.errors?.[0]?.description || 'Erro na integração com Asaas');
  }

  return data;
}

export const asaas = {
  // Customers
  async createCustomer(data: {
    name: string;
    email?: string;
    cpfCnpj: string;
    mobilePhone?: string;
    notificationDisabled?: boolean;
    postalCode?: string;
    addressNumber?: string;
  }) {
    return asaasFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCustomer(id: string) {
    return asaasFetch(`/customers/${id}`);
  },

  // Subscriptions
  async createSubscription(data: {
    customer: string;
    billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description: string;
    creditCard?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo?: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
  }) {
    return asaasFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSubscriptionPayments(id: string) {
    return asaasFetch(`/subscriptions/${id}/payments`);
  },

  async getSubscription(id: string) {
    return asaasFetch(`/subscriptions/${id}`);
  },

  async deleteSubscription(id: string) {
    return asaasFetch(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
  },

  // Payments (Direct/Instant)
  async getPayment(id: string) {
    return asaasFetch(`/payments/${id}`);
  },

  async getPixQrCode(id: string) {
    return asaasFetch(`/payments/${id}/pixQrCode`);
  },
};
