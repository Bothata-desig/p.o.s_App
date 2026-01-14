export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  color: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SaleRecord {
  id: string;
  timestamp: number;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
}

export type ViewState = 'pos' | 'inventory' | 'reports';

export interface BusinessStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  createdAt: number;
  lastLogin?: number;
}

export interface AuthSession {
  userId: string;
  username: string;
  role: string;
  loginTime: number;
  sessionToken: string;
}