export interface User {
  id: string;
  email: string;
  name: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

export const MENU_ITEMS = [
  { id: '1', name: 'Chocolate Lava Cake', price: 350, category: 'Desserts' },
  { id: '2', name: 'Tiramisu', price: 420, category: 'Desserts' },
  { id: '3', name: 'Cheesecake', price: 380, category: 'Desserts' },
  { id: '4', name: 'Espresso', price: 180, category: 'Drinks' },
  { id: '5', name: 'Cappuccino', price: 220, category: 'Drinks' },
  { id: '6', name: 'Fresh Lime Soda', price: 150, category: 'Drinks' },
  { id: '7', name: 'Grilled Salmon', price: 1250, category: 'Main Course' },
  { id: '8', name: 'Ribeye Steak', price: 1850, category: 'Main Course' },
  { id: '9', name: 'Pasta Carbonara', price: 650, category: 'Main Course' },
  { id: '10', name: 'Caesar Salad', price: 450, category: 'Appetizers' },
  { id: '11', name: 'Bruschetta', price: 320, category: 'Appetizers' },
];
