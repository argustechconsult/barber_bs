import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read raw file
const envPath = path.resolve(process.cwd(), '.env');
console.log('Reading .env from:', envPath);

try {
  const rawContent = fs.readFileSync(envPath, 'utf8');
  console.log('--- RAW CONTENT START ---');
  console.log(rawContent);
  console.log('--- RAW CONTENT END ---');
  
  // Check for lines with ASAAS
  const lines = rawContent.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('ASAAS')) {
      console.log(`Line ${i + 1}: ${JSON.stringify(line)}`);
    }
  });

} catch (e) {
  console.error('Error reading .env file:', e);
}

// 2. Load with dotenv
const result = dotenv.config();

if (result.error) {
  console.error('dotenv error:', result.error);
}

console.log('--- PARSED ENV VARS ---');
const key = process.env.ASAAS_API_KEY;
console.log('ASAAS_API_KEY type:', typeof key);
console.log('ASAAS_API_KEY length:', key ? key.length : 'N/A');
console.log('ASAAS_API_KEY value (JSON):', JSON.stringify(key));
