import 'dotenv/config';
import { getAppointmentsByBarber } from '../actions/appointment/appointment.actions';

async function test() {
    const barberId = 'e1b37b80-c33b-48f3-8f87-a36372662a4d'; // Correct ID for Jorge
    const dateStr = '2026-02-05';

    console.log(`--- TESTING getAppointmentsByBarber with standard action ---`);
    const res = await getAppointmentsByBarber(barberId, dateStr);
    console.log('Result:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
