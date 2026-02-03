'use server';

import { CartItem, AddressData } from '../../types';

interface MelhorEnvioProduct {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
}

interface CalculateShippingParams {
  toCep: string;
  items: CartItem[];
  services?: string; // "1,2" for SEDEX/PAC, etc.
}

interface ShippingOption {
  id: number;
  name: string;
  price: string;
  custom_price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  custom_delivery_time: number;
  error?: string;
  company: {
    id: number;
    name: string;
    picture: string;
  };
}

export const calculateShipping = async ({
  toCep,
  items,
  services = '1,2,3,4,17,18,19,20,21,22,23,24', // Default to common services (Correios, Jadlog, etc)
}: CalculateShippingParams): Promise<ShippingOption[]> => {
  const fromCep = process.env.MELHOR_ENVIO_FROM_CEP;
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const email = process.env.MELHOR_ENVIO_EMAIL;
  
  // Use sandbox URL by default, or change to production if env var set (optional)
  const apiUrl = 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate';

  if (!fromCep || !token || !email) {
    // throw new Error('Missing Melhor Envio environment variables (FROM_CEP, TOKEN, EMAIL)');
    console.warn('Missing Melhor Envio vars, returning empty');
    return [];
  }

  const products: MelhorEnvioProduct[] = items.map((item) => ({
    id: item.id,
    width: item.width || 20, // Default fallback
    height: item.height || 10,
    length: item.length || 20,
    weight: item.weight || 0.5,
    insurance_value: item.price,
    quantity: item.quantity,
  }));

  const payload = {
    from: { postal_code: fromCep },
    to: { postal_code: toCep },
    products,
    options: {
      receipt: false,
      own_hand: false,
    },
    services,
  };


  console.log('--- MELHOR ENVIO REQUEST ---');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': `${email}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('--- MELHOR ENVIO ERROR ---');
        console.error('Status:', response.status);
        console.error('Error Text:', errorText);
        // throw new Error(`Shipping calculation failed: ${response.status} ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    console.log('--- MELHOR ENVIO RESPONSE ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Melhor Envio might return an object with errors or an array
    if (Array.isArray(data)) {
        // Filter out options with errors
        return data.filter((opt: ShippingOption) => !opt.error);
    }
    
    return [];
  } catch (error) {
    console.error('Error calculating shipping:', error);
    // throw error;
    return [];
  }
};

export const getAddressByCep = async (cep: string): Promise<{ success: boolean; data?: AddressData; message?: string }> => {
    // Remove formatting
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
        return { success: false, message: 'CEP inválido' };
    }

    try {
        // Using BrasilAPI as it is robust and free
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        
        if (!response.ok) {
            return { success: false, message: 'CEP não encontrado' };
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                cep: data.cep,
                state: data.state,
                city: data.city,
                neighborhood: data.neighborhood,
                street: data.street,
            }
        };

    } catch (error) {
        console.error('Error fetching CEP:', error);
        return { success: false, message: 'Erro ao buscar CEP' };
    }
};
