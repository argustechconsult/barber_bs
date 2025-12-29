
export enum UserRole {
  CLIENTE = 'CLIENTE',
  BARBEIRO = 'BARBEIRO',
  ADMIN = 'ADMIN'
}

export enum UserPlan {
  START = 'START',
  PREMIUM = 'PREMIUM'
}

export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  role: UserRole;
  plan?: UserPlan;
  barbeiroId?: string;
  isActive: boolean;
}

export interface Barbeiro {
  id: string;
  nome: string;
  foto: string;
  bio?: string;
  intervaloAtendimento: number; // minutes
  horariosTrabalho: {
    inicio: string;
    fim: string;
  };
  ativo: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  barbeiroId: string;
  serviceId: string;
  date: string; // ISO string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED';
  convertedBy?: string; // barbeiroId
  createdAt: string;
}
