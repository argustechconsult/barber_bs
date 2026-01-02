import 'dotenv/config';
import { getBarberSchedule } from '../actions/appointment.actions';

async function main() {
  const barberId = '89c5de24-0b0f-4879-bd01-ac9a01d526b9'; // João ID
  const dateStr = '2026-01-02';
  
  console.log(`Fetching for Barber ${barberId} on ${dateStr}`);
  
  const result = await getBarberSchedule(barberId, dateStr);
  console.log('Result:', result);
}

main();
