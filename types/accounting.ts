export interface AccountingLedgerEntry {
  id: string
  order_id: string
  transaction_date: string
  gross_sales: number
  cogs: number
  delivery_fee: number
  net_profit: number
  exported: boolean
  exported_at: string | null
  created_at: string
}

export interface JoinedLedgerEntry extends AccountingLedgerEntry {
  order: {
    customer_name: string
    phone_number: string
    delivery_type: 'delivery' | 'pickup'
    product_type: 'solo_sweet' | 'family_box' | 'mega_craving'
    quantity: number
    status: string
  }
}

export interface FinancialMetrics {
  totalGrossSales: number
  totalCOGS: number
  totalDeliveryFees: number
  totalNetProfit: number
  totalOrders: number
  exportedCount: number
  pendingExportCount: number
}