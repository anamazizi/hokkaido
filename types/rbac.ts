import type { Order } from '@/types/order'

export type UserRole = 'user' | 'staff' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface OrderLog {
  id: string
  order_id: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  action_type: string
  notes: string | null
  created_at: string
}

export interface OrderWithLogs extends Order {
  logs?: OrderLog[]
}