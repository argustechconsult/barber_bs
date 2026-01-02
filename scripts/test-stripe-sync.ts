import 'dotenv/config';
import { createProduct, createService } from '../actions/stripe.actions';

async function main() {
  console.log('--- Testing Stripe Integration ---');
  
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error('ERROR: STRIPE_SECRET_KEY not found in .env');
      return;
  }

  // 1. Test Service Creation
  console.log('\nCreating Test Service...');
  const service = await createService({
      name: 'Corte Teste Integration',
      price: 50.00
  });
  console.log('Service Result:', service);

  // 2. Test Product Creation
  console.log('\nCreating Test Product...');
  const product = await createProduct({
      name: 'Pomada Modeladora Teste',
      description: 'Pomada efeito matte alta fixação',
      category: 'Cabelo',
      price: 35.00
  });
  console.log('Product Result:', product);
}

main();
