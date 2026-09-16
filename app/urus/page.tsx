'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { LogOut, Package, CheckCircle, Clock, Phone, DollarSign, FileText, BarChart3, Download, Truck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types/order'
import type { AccountingLedgerEntry, JoinedLedgerEntry, FinancialMetrics } from '@/types/accounting'

const STATUS_LABELS: Record<OrderStatus, string> = { pending: 'Baru Masuk', accepted: 'Disahkan', preparing: 'Sedang Bakar/Sedia', ready_pickup: 'Sedia Diambil', delivering: 'Sedang Dihantar', completed: 'Selesai', cancelled: 'Dibatalkan' }
const STATUS_COLORS: Record<OrderStatus, string> = { pending: 'bg-yellow-100 text-yellow-800', accepted: 'bg-blue-100 text-blue-800', preparing: 'bg-purple-100 text-purple-800', ready_pickup: 'bg-green-100 text-green-800', delivering: 'bg-indigo-100 text-indigo-800', completed: 'bg-gray-100 text-gray-800', cancelled: 'bg-red-100 text-red-800' }

type RawLedgerEntry = AccountingLedgerEntry & {
  order: {
    customer_name: string
    phone_number: string
    delivery_type: 'delivery' | 'pickup'
    product_type: 'solo_sweet' | 'family_box' | 'mega_craving'
    quantity: number
    status: string
  } | null
}

type DashboardTab = 'all' | OrderStatus | 'finance' | 'ledger'

export default function UrusDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTab>('all')
  const [user, setUser] = useState<User | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<JoinedLedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalGrossSales: 0,
    totalCOGS: 0,
    totalDeliveryFees: 0,
    totalNetProfit: 0,
    totalOrders: 0,
    exportedCount: 0,
    pendingExportCount: 0,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchOrders()
    fetchLedger()
    const ordersChannel = supabase.channel('orders_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe()
    const ledgerChannel = supabase.channel('ledger_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_ledger' }, fetchLedger).subscribe()
    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(ledgerChannel)
    }
  }, [])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }
const fetchLedger = async () => {
    try {
      setLedgerLoading(true)
      const { data, error } = await supabase
        .from('accounting_ledger')
        .select('*, order:orders(customer_name, phone_number, delivery_type, product_type, quantity, status)')
        .order('transaction_date', { ascending: false })
      if (error) throw error
      const joinedData: JoinedLedgerEntry[] = (data || []).map((entry: RawLedgerEntry) => ({
        ...entry,
        order: entry.order || {
          customer_name: 'Unknown',
          phone_number: '',
          delivery_type: 'pickup' as const,
          product_type: 'solo_sweet' as const,
          quantity: 0,
          status: 'completed',
        },
      }))
      setLedgerEntries(joinedData)
      calculateFinancialMetrics(joinedData)
    } catch (error) {
      console.error('Error fetching ledger:', error)
    } finally {
      setLedgerLoading(false)
    }
  }

  const calculateFinancialMetrics = (entries: JoinedLedgerEntry[]) => {
    const totalGrossSales = entries.reduce((sum, e) => sum + e.gross_sales, 0)
    const totalCOGS = entries.reduce((sum, e) => sum + e.cogs, 0)
    const totalDeliveryFees = entries.reduce((sum, e) => sum + e.delivery_fee, 0)
    const totalNetProfit = entries.reduce((sum, e) => sum + e.net_profit, 0)
    const exportedCount = entries.filter(e => e.exported).length
    const pendingExportCount = entries.filter(e => !e.exported).length

    setFinancialMetrics({
      totalGrossSales,
      totalCOGS,
      totalDeliveryFees,
      totalNetProfit,
      totalOrders: entries.length,
      exportedCount,
      pendingExportCount,
    })
  }

const exportCSV = async () => {
    try {
      // Filter entries that are not yet exported (or could be all)
      const toExport = ledgerEntries.filter(e => !e.exported)
      if (toExport.length === 0) {
        alert('Tiada rekod baharu untuk dieksport. Semua transaksi telah dieksport.')
        return
      }

      // Create CSV content
      const headers = [
        'Transaction_ID',
        'Date',
        'Customer_Name',
        'Product_Set',
        'Quantity',
        'Delivery_Type',
        'Gross_Amount_MYR',
        'COGS_MYR',
        'Delivery_Fee_MYR',
        'Net_Profit_MYR',
        'LHDN_Classification'
      ]

      const rows = toExport.map(entry => [
        entry.order_id,
        new Date(entry.transaction_date).toISOString().split('T')[0],
        entry.order.customer_name,
        entry.order.product_type === 'solo_sweet' ? 'Set Solo Sweet (3 pcs)' :
          entry.order.product_type === 'family_box' ? 'Set Family Box (12 pcs)' : 'Set Mega Craving (25 pcs)',
        entry.order.quantity,
        entry.order.delivery_type === 'delivery' ? 'COD Delivery' : 'Pickup',
        entry.gross_sales.toFixed(2),
        entry.cogs.toFixed(2),
        entry.delivery_fee.toFixed(2),
        entry.net_profit.toFixed(2),
        'Food & Beverage Retail'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `LHDN_Export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Update exported flag in database
      const { error } = await supabase
        .from('accounting_ledger')
        .update({ exported: true, exported_at: new Date().toISOString() })
        .in('id', toExport.map(e => e.id))
      
      if (error) throw error

      // Refresh ledger data to reflect changes
      fetchLedger()
      alert(`Berjaya mengeksport ${toExport.length} transaksi ke CSV.`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Ralat semasa mengeksport CSV.')
    }
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/urus/login'
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      if (error) throw error
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Ralat mengemas kini status pesanan.')
    }
  }

  const generateWhatsAppLink = (order: Order, status: OrderStatus) => {
    const templates: Record<OrderStatus, string> = {
      pending: `Hai ${order.customer_name}, pesanan Hokkaido #${order.id} disahkan. Kami akan mula sediakan sebentar lagi.`,
      accepted: `Hai ${order.customer_name}, pesanan Hokkaido #${order.id} disahkan. Kami akan mula sediakan sebentar lagi.`,
      preparing: `Hokkaido anda sedang disediakan 🧀`,
      ready_pickup: `Hai ${order.customer_name}, pesanan Hokkaido #${order.id} sedia diambil di kedai.`,
      delivering: `Hai ${order.customer_name}, rider dalam perjalanan ke lokasi anda. Sila sediakan tunai COD: RM ${order.total_price}.`,
      completed: `Terima kasih ${order.customer_name}! Pesanan Hokkaido #${order.id} selesai. Semoga menikmati Hokkaido anda! 🧀`,
      cancelled: '',
    }
    const template = templates[status]
    if (!template) return ''
    const phone = order.phone_number.replace(/[^0-9]/g, '')
    const encoded = encodeURIComponent(template)
    return `https://wa.me/${phone}?text=${encoded}`
  }
const renderFinanceSection = () => (
    <div className="space-y-8">
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500">Jumlah Kasar Jualan</p>
              <p className="text-3xl font-bold">{formatCurrency(financialMetrics.totalGrossSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-4">
              <Package className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-gray-500">Jumlah Kos Modal (COGS)</p>
              <p className="text-3xl font-bold">{formatCurrency(financialMetrics.totalCOGS)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500">Jumlah Tambang Penghantaran</p>
              <p className="text-3xl font-bold">{formatCurrency(financialMetrics.totalDeliveryFees)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-4">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500">Keuntungan Bersih</p>
              <p className="text-3xl font-bold">{formatCurrency(financialMetrics.totalNetProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export CSV Button */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Eksport Data LHDN (Consolidated e-Invoice)</h3>
            <p className="text-gray-600">
              {financialMetrics.pendingExportCount} transaksi belum dieksport. 
              {financialMetrics.exportedCount} transaksi telah dieksport.
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={financialMetrics.pendingExportCount === 0}
            className="mt-4 md:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
          >
            <Download className="h-5 w-5" />
            Eksport CSV LHDN (Bulanan)
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Format CSV: Transaction_ID, Date, Customer_Name, Product_Set, Quantity, Delivery_Type, Gross_Amount_MYR, COGS_MYR, Delivery_Fee_MYR, Net_Profit_MYR, LHDN_Classification</p>
        </div>
      </div>
    </div>
  )

const renderLedgerSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h2 className="text-2xl font-bold">Lejar Transaksi Selesai</h2>
        <button
          onClick={exportCSV}
          disabled={financialMetrics.pendingExportCount === 0}
          className="mt-4 md:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
        >
          <Download className="h-5 w-5" />
          Eksport CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarikh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pesanan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaedah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jualan Kasar (RM)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COGS (RM)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery (RM)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Untung Bersih (RM)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status e-Invois</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.transaction_date).toLocaleDateString('ms-MY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {entry.order_id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.order.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.order.delivery_type === 'delivery' ? 'COD' : 'Pickup'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(entry.gross_sales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(entry.cogs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(entry.delivery_fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(entry.net_profit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${entry.exported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {entry.exported ? 'Exported' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledgerEntries.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tiada rekod lejar</h3>
            <p className="text-gray-600">Tiada transaksi selesai direkodkan dalam lejar.</p>
          </div>
        )}
      </div>
    </div>
  )
  const filteredOrders = activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab)
  const stats = { total: orders.length, pending: orders.filter((o) => o.status === 'pending').length, completed: orders.filter((o) => o.status === 'completed').length }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="bg-white border-b border-gray-300 px-4 py-4">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Pengurusan Pesanan</h1>
            <p className="text-gray-600">Selamat datang, {user?.email || 'Pengurus'}</p>
          </div>
          <button onClick={handleLogout} className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition">
            <LogOut className="h-4 w-4" /> Log Keluar
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4"><Package className="h-6 w-6 text-blue-600" /></div>
              <div><p className="text-gray-500">Total Pesanan</p><p className="text-3xl font-bold">{stats.total}</p></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-4"><Clock className="h-6 w-6 text-yellow-600" /></div>
              <div><p className="text-gray-500">Menunggu</p><p className="text-3xl font-bold">{stats.pending}</p></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border border-gray-300">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-4"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              <div><p className="text-gray-500">Selesai</p><p className="text-3xl font-bold">{stats.completed}</p></div>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-slate-900'}`}>Semua</button>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <button key={status} onClick={() => setActiveTab(status as OrderStatus)} className={`px-4 py-2 rounded-lg font-medium ${activeTab === status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-slate-900'}`}>{label}</button>
            ))}
            <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'finance' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-slate-900'}`}>
              <DollarSign className="inline-block h-4 w-4 mr-2" /> Kewangan
            </button>
            <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'ledger' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-slate-900'}`}>
              <FileText className="inline-block h-4 w-4 mr-2" /> Lejar
            </button>
          </div>
        </div>
        {(activeTab === 'finance' || activeTab === 'ledger') ? (
          ledgerLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Memuatkan data kewangan...</p>
            </div>
          ) : activeTab === 'finance' ? (
            renderFinanceSection()
          ) : (
            renderLedgerSection()
          )
        ) : loading ? (
          <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div><p className="mt-4 text-gray-600">Memuatkan pesanan...</p></div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-300 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tiada pesanan</h3>
            <p className="text-gray-600">Tiada pesanan yang sepadan dengan status ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const nextStatus: Record<OrderStatus, OrderStatus | null> = {
                pending: 'accepted',
                accepted: 'preparing',
                preparing: order.delivery_type === 'pickup' ? 'ready_pickup' : 'delivering',
                ready_pickup: 'completed',
                delivering: 'completed',
                completed: null,
                cancelled: null,
              }
              const next = nextStatus[order.status]
              const whatsappLink = generateWhatsAppLink(order, order.status)
              return (
                <div key={order.id} className="bg-white rounded-xl shadow border border-gray-300 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                      <h3 className="text-xl font-bold mt-2">#{order.id.slice(0, 8)}</h3>
                      <p className="text-gray-600">{new Date(order.created_at).toLocaleString('ms-MY')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(order.total_price)}</p>
                      <p className="text-gray-500">COD</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p><strong>{order.customer_name}</strong> • {order.phone_number}</p>
                    <p>{order.product_type} × {order.quantity}</p>
                    <p>{order.delivery_type === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri'}</p>
                    {order.distance_km && <p>Jarak: {order.distance_km.toFixed(2)} km</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {next && <button onClick={() => updateOrderStatus(order.id, next!)} className="flex-1 min-w-[140px] py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Tandai {STATUS_LABELS[next!]}</button>}
                    {whatsappLink && <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"><Phone className="h-4 w-4" /> WhatsApp</a>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
