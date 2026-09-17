export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready_pickup' | 'delivering' | 'completed' | 'cancelled'

export interface Order {
  id: string
  customer_name: string
  phone_number: string
  delivery_address: string
  delivery_type: 'delivery' | 'pickup'
  latitude: number | null
  longitude: number | null
  distance_km: number | null
  delivery_fee: number
  product_type: 'solo_sweet' | 'family_box' | 'mega_craving'
  quantity: number
  unit_price: number
  total_price: number
  cogs: number
  net_profit: number
  status: OrderStatus
  notes: string | null
items?: any[]
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
}