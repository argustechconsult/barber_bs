
import { UserRole, UserPlan, User, Barbeiro, Service, Appointment, Lead, Product, ProductCategory } from './types';

export const SERVICES: Service[] = [
  { id: '1', name: 'Corte Social', price: 40, duration: 30 },
  { id: '2', name: 'Degradê / Fade', price: 50, duration: 45 },
  { id: '3', name: 'Barba Completa', price: 30, duration: 30 },
  { id: '4', name: 'Corte + Barba', price: 70, duration: 60 },
  { id: '5', name: 'Platinado / Nevou', price: 120, duration: 120 },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: '1', name: 'Cabelo' },
  { id: '2', name: 'Barba' },
  { id: '3', name: 'Acessórios' },
  { id: '4', name: 'Pós-Barba' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Pomada Efeito Matte', price: 45, category: '1', stock: 15, image: 'https://images.unsplash.com/photo-1590159763121-7c9ff3121ef3?q=80&w=400&h=400&auto=format&fit=crop' },
  { id: 'p2', name: 'Óleo para Barba Wood', price: 35, category: '2', stock: 10, image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=400&h=400&auto=format&fit=crop' },
  { id: 'p3', name: 'Balm Hidratante', price: 30, category: '2', stock: 8, image: 'https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&h=400&auto=format&fit=crop' },
  { id: 'p4', name: 'Escova de Madeira', price: 25, category: '3', stock: 20, image: 'https://images.unsplash.com/photo-1590540179852-2110a54f813a?q=80&w=400&h=400&auto=format&fit=crop' },
  { id: 'p5', name: 'Shampoo Mentolado', price: 55, category: '1', stock: 12, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&h=400&auto=format&fit=crop' },
];

export const MOCK_BARBERS: Barbeiro[] = [
  {
    id: 'b1',
    nome: 'Guilherme Souza',
    foto: '/guilhermesouza.png',
    bio: 'Especialista em visagismo e degradês modernos.',
    intervaloAtendimento: 30,
    horariosTrabalho: { inicio: '09:00', fim: '19:00' },
    ativo: true,
  },
  {
    id: 'b2',
    nome: 'Josimar',
    foto: '/josimar.png',
    bio: 'Mais de 10 anos de experiência em cortes clássicos.',
    intervaloAtendimento: 45,
    horariosTrabalho: { inicio: '10:00', fim: '20:00' },
    ativo: true,
  },
  {
    id: 'b3',
    nome: 'Vinícius',
    foto: '/vinicius.png',
    bio: 'Mestre na navalha e barbas terapêuticas.',
    intervaloAtendimento: 30,
    horariosTrabalho: { inicio: '08:00', fim: '18:00' },
    ativo: true,
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Guilherme Souza',
    email: 'guilherme',
    role: UserRole.ADMIN,
    isActive: true,
    barbeiroId: 'b1'
  },
  {
    id: 'u2',
    name: 'Josimar',
    email: 'josimar',
    role: UserRole.BARBEIRO,
    isActive: true,
    barbeiroId: 'b2'
  },
  {
    id: 'u3',
    name: 'Vinícius',
    email: 'vinicius',
    role: UserRole.BARBEIRO,
    isActive: true,
    barbeiroId: 'b3'
  },
  {
    id: 'u2',
    name: 'Cliente Exemplo',
    email: 'cliente',
    whatsapp: '11999999999',
    role: UserRole.CLIENTE,
    plan: UserPlan.START,
    isActive: true
  },
  {
    id: 'start',
    name: 'Client Start',
    email: 'start',
    role: UserRole.CLIENTE,
    plan: UserPlan.START,
    isActive: true
  },
  {
    id: 'premium',
    name: 'Client Premium',
    email: 'premium',
    role: UserRole.CLIENTE,
    plan: UserPlan.PREMIUM,
    isActive: true
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'ap1',
    clientId: 'u2',
    clientName: 'Cliente Exemplo',
    barbeiroId: 'b1',
    serviceId: '1',
    date: new Date().toISOString(),
    status: 'CONFIRMED'
  }
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l1', name: 'Marcos Rezende', whatsapp: '11988887777', status: 'NEW', createdAt: new Date().toISOString() },
  { id: 'l2', name: 'Fábio Junior', whatsapp: '11977776666', status: 'CONTACTED', createdAt: new Date().toISOString() },
];
