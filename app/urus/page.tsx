'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { LogOut, Package, CheckCircle, Clock, Phone, DollarSign, FileText, BarChart3, Download, Truck, XCircle, Share, Loader2, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types/order'
import type { AccountingLedgerEntry, JoinedLedgerEntry, FinancialMetrics } from '@/types/accounting'
import type { UserProfile, OrderLog } from '@/types/rbac'
import type { CustomerReview } from '@/types/review'

const STATUS_LABELS: Record<OrderStatus, string> = { pending: 'Baru Masuk', accepted: 'Disahkan', preparing: 'Sedang Disediakan', ready_pickup: 'Sedia Diambil', delivering: 'Sedang Dihantar', completed: 'Selesai', cancelled: 'Dibatalkan' }
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

type DashboardTab = 'all' | OrderStatus | 'finance' | 'ledger' | 'reviews'

export default function UrusDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTab>('all')
  const [user, setUser] = useState<User | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
const [orderLogsMap, setOrderLogsMap] = useState<Record<string, OrderLog[]>>({})
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
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
const [pendingReviews, setPendingReviews] = useState<CustomerReview[]>([])
  const [approvedReviews, setApprovedReviews] = useState<CustomerReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const router = useRouter()
  // STRICT AUTHENTICATION & RBAC ENFORCEMENT
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        // Step 1: Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        // Step 2: If no user, redirect to login
        if (!user) {
          router.replace('/urus/login')
          return
        }
        
        setUser(user)
        
        // Step142 3: Fetch user profile for RBAC check
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        // Step 4: ADMIN EMAIL BYPASS - Normalize email and allow immediate access for known admin email
        const userEmail = (user.email || '').toLowerCase().trim()
        const isAdminEmail = userEmail === 'anamazizi@gmail.com'
        
        // Step 5: STRICT ROLE VALIDATION
        const userRole = profile?.role || 'user'
        
        // Step 6: ADMIN BYPASS - Grant full admin access if email matches
        if (isAdminEmail) {
          console.log(`Admin email bypass: User ${userEmail} granted admin access despite role '${userRole}'`)
          // Admin email gets full access, continue to load dashboard
          setUserProfile({ ...profile, role: 'admin' } as UserProfile)
        } else if (userRole !== 'staff' && userRole !== 'admin') {
          // Step 7: Redirect 'user' role to login page IMMEDIATELY
          console.warn(`RBAC BLOCK: User ${user.email} with role '${userRole}' attempted to access /urus dashboard, redirecting to login`)
          router.replace('/urus/login?error=unauthorized')
          return
        }
        
        // Step 6: Only for 'staff' or 'admin' roles, set profile and proceed
        if (profile) {
          setUserProfile(profile)
        }
        
        // Step 7: Fetch data only after successful role validation
        fetchOrders()
        fetchLedger()
        fetchAllOrderLogs()
        
        // Step 8: Subscribe to realtime channels
        const ordersChannel = supabase.channel('orders_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe()
        const ledgerChannel = supabase.channel('ledger_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_ledger' }, fetchLedger).subscribe()
        const logsChannel = supabase.channel('order_logs_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'order_logs' }, fetchAllOrderLogs).subscribe()

        // Cleanup function
        return () => {
          supabase.removeChannel(ordersChannel)
          supabase.removeChannel(ledgerChannel)
          supabase.removeChannel(logsChannel)
        }
        
      } catch (error) {
        console.error('Authentication/RBAC error:', error)
        // On any error, redirect to home for security
        router.replace('/')
      } finally {
        setAuthChecking(false)
      }
    }
    
    checkAuthAndRole()
  }, [router])
useEffect(() => {
    if (activeTab === 'reviews' && reviewsLoading) {
      fetchReviews()
    }
  }, [activeTab])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setOrders(data || [])
      
      // Juga muat semua log dari order_logs untuk audit trail yang lengkap
      await fetchAllOrderLogs()
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
const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('customer_reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (reviewsErr) {
        console.error('CRITICAL: Ralat baca customer_reviews di /urus:', reviewsErr)
      }

      const pending = reviewsData?.filter(review => !review.is_approved) || []
      const approved = reviewsData?.filter(review => review.is_approved) || []

      setPendingReviews(pending)
      setApprovedReviews(approved)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setReviewsLoading(false)
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

const handleApproveReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('customer_reviews')
        .update({ is_approved: true, updated_at: new Date().toISOString() })
        .eq('id', reviewId)

      if (error) {
        console.error('CRITICAL Ralat Lulus Ulasan:', error)
        alert('Ralat meluluskan ulasan: ' + (error.message || JSON.stringify(error)))
        return
      }

      // Update local state
      setPendingReviews(prev => prev.filter(r => r.id !== reviewId))
      const review = pendingReviews.find(r => r.id === reviewId)
      if (review) {
        setApprovedReviews(prev => [{ ...review, is_approved: true }, ...prev])
      }
    } catch (error) {
      console.error('Error approving review:', error)
      alert('Ralat meluluskan ulasan: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleUnapproveReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('customer_reviews')
        .update({ is_approved: false, updated_at: new Date().toISOString() })
        .eq('id', reviewId)

      if (error) {
        console.error('CRITICAL Ralat Tarik Balik Kelulusan Ulasan:', error)
        alert('Ralat menarik balik kelulusan ulasan: ' + (error.message || JSON.stringify(error)))
        return
      }

      // Update local state
      setApprovedReviews(prev => prev.filter(r => r.id !== reviewId))
      const review = approvedReviews.find(r => r.id === reviewId)
      if (review) {
        setPendingReviews(prev => [{ ...review, is_approved: false }, ...prev])
      }
    } catch (error) {
      console.error('Error unapproving review:', error)
      alert('Ralat menarik balik kelulusan ulasan: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Adakah anda pasti mahu memadam ulasan ini? Tindakan ini tidak boleh dibatalkan.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('customer_reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('CRITICAL Ralat Padam Ulasan:', error)
        alert('Ralat memadam ulasan: ' + (error.message || JSON.stringify(error)))
        return
      }

      // Update local state
      setPendingReviews(prev => prev.filter(r => r.id !== reviewId))
      setApprovedReviews(prev => prev.filter(r => r.id !== reviewId))
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Ralat memadam ulasan: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
const renderReviewsSection = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Moderasi Ulasan Pelanggan</h2>
      
      {/* Pending Reviews */}
      <div className="bg-white rounded-xl shadow border border-gray-300 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Star className="mr-2 h-5 w-5 text-yellow-500" />
          Menunggu Kelulusan ({pendingReviews.length})
        </h3>
        
        {pendingReviews.length === 0 ? (
          <p className="text-gray-500">Tiada ulasan yang menunggu kelulusan.</p>
        ) : (
          <div className="space-y-6">
            {pendingReviews.map((review) => (
              <div key={review.id} className="border border-yellow-200 rounded-lg p-5 bg-yellow-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{review.customer_name}</h4>
                    <div className="flex items-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < review.rating
                              ? 'fill-amber-400 stroke-amber-500'
                              : 'fill-gray-200 stroke-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-3 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('ms-MY', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleApproveReview(review.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center"
                    >
                      Luluskan
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center"
                    >
                      Padam
                    </button>
                  </div>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{review.review_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Reviews */}
      <div className="bg-white rounded-xl shadow border border-gray-300 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Star className="mr-2 h-5 w-5 text-green-500" />
          Telah Diluluskan ({approvedReviews.length})
        </h3>
        
        {approvedReviews.length === 0 ? (
          <p className="text-gray-500">Tiada ulasan yang telah diluluskan.</p>
        ) : (
          <div className="space-y-6">
            {approvedReviews.map((review) => (
              <div key={review.id} className="border border-green-200 rounded-lg p-5 bg-green-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{review.customer_name}</h4>
                    <div className="flex items-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < review.rating
                              ? 'fill-amber-400 stroke-amber-500'
                              : 'fill-gray-200 stroke-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-3 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('ms-MY', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUnapproveReview(review.id)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg flex items-center"
                    >
                      Tarik Balik / Nyah-lulus
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center"
                    >
                      Padam
                    </button>
                  </div>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{review.review_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
// fetchUserProfile function has been integrated into the main authentication/RBAC flow
// See the useEffect above for the consolidated implementation

const fetchAllOrderLogs = async () => {
    try {
      console.log('fetchAllOrderLogs: Fetching all order logs from Supabase...')
      const { data, error } = await supabase
        .from('order_logs')
        .select('*')
        .order('created_at', { ascending: true }) // Fetch in chronological order for proper sequencing
      
      if (error) {
        console.error('Gagal baca order_logs:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }
      
      console.log(`fetchAllOrderLogs: Successfully fetched ${data?.length || 0} logs`)
      
      // Deduplicate logs by id (ensure no duplicate entries)
      const uniqueLogs = Array.from(
        new Map((data || []).map((log) => [log.id, log])).values()
      )
      
      // Group logs by order_id
      const map: Record<string, OrderLog[]> = {}
      uniqueLogs.forEach(log => {
        if (!map[log.order_id]) map[log.order_id] = []
        map[log.order_id].push(log)
      })
      
      console.log(`fetchAllOrderLogs: Deduplicated ${data?.length || 0} logs to ${uniqueLogs.length} unique logs, created map with ${Object.keys(map).length} order entries`)
      setOrderLogsMap(map)
    } catch (error) {
      console.error('Error fetching order logs:', error)
    }
  }

  const logOrderAction = async (orderId: string, actionType: string, notes?: string) => {
    if (!user) {
      console.error('logOrderAction: No authenticated user, skipping log')
      return
    }
    try {
      // Get user profile for logging
      let userProfileData = userProfile
      if (!userProfileData) {
        console.log('logOrderAction: Fetching user profile for', user.id)
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error('logOrderAction: Error fetching user profile:', profileError)
          console.log('logOrderAction: Using fallback user data')
        } else {
          userProfileData = data
        }
      }

      // If still no profile data, use fallback from user metadata
      if (!userProfileData) {
        const actorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'System'
        const actorRole = 'admin' // Default fallback
        console.log('logOrderAction: Using fallback actor:', { actorName, actorRole })
        
        const { error } = await supabase
          .from('order_logs')
          .insert({
            order_id: orderId,
            actor_id: user.id,
            actor_name: actorName,
            actor_role: actorRole,
            action: actionType,
            action_type: actionType,
            notes
          })
        
        if (error) {
          console.error('logOrderAction: INSERT error (with fallback):', error)
          console.error('logOrderAction: Error details:', JSON.stringify(error, null, 2))
        }
        return
      }

      const { error } = await supabase
        .from('order_logs')
        .insert({
          order_id: orderId,
          actor_id: user.id,
          actor_name: userProfileData.full_name,
          actor_role: userProfileData.role,
          action: actionType,
          action_type: actionType,
          notes
        })
      
      if (error) {
        console.error('logOrderAction: INSERT error:', error)
        console.error('logOrderAction: Payload:', {
          order_id: orderId,
          actor_id: user.id,
          actor_name: userProfileData.full_name,
          actor_role: userProfileData.role,
          action_type: actionType,
          notes
        })
        throw error
      }
    } catch (error) {
      console.error('Error logging order action:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoadingId(orderId + '_status_' + newStatus)
    try {
      // Get current order status from state
      const currentOrder = orders.find(o => o.id === orderId)
      const oldStatus = currentOrder?.status || 'pending'
      
      // Get admin name and role as specified in .clinerules
      const actorName = userProfile?.full_name || 'Anam Azizi'
      const actorRole = userProfile?.role || 'admin'

      // 1. OPTIMISTIC UPDATE: Update orders state immediately
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      )

      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      if (error) throw error
      
      // Logging handled by database trigger
      
      // Log will appear via database trigger and realtime subscription
      
      // Immediately refresh the order logs to show the new entry
      await fetchAllOrderLogs()
      
      // Also refresh orders to update the status in the list
      await fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Ralat mengemas kini status pesanan.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const cancelOrder = async (orderId: string) => {
    
    setActionLoadingId(orderId + '_cancel')
    try {
      // Get admin name and role as specified in .clinerules
      const actorName = userProfile?.full_name || 'Anam Azizi'
      const actorRole = userProfile?.role || 'admin'

      // 1. OPTIMISTIC UPDATE: Update orders state immediately
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled', cancelled_at: new Date().toISOString() }
            : order
        )
      )

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
      if (error) throw error
      
      // Logging handled by database trigger
      // Log will appear via database trigger and realtime subscription
      
      
      
      // Immediately refresh the order logs to show the new cancellation entry
      await fetchAllOrderLogs()
      
      // Also refresh orders to update the status in the list
      await fetchOrders()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('Ralat membatalkan pesanan.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const generateWhatsAppLink = (order: Order, status: OrderStatus) => {
    const templates: Record<OrderStatus, string> = {
      pending: `Hai ${order.customer_name}, pesanan Hokkaido disahkan.\n\nKami akan mula sediakan sebentar lagi.\n\nRujukan Order : #${order.id}`,
      accepted: `Hai ${order.customer_name}, pesanan Hokkaido disahkan.\n\nKami akan mula sediakan sebentar lagi.\n\nRujukan Order : #${order.id}`,
      preparing: `Hai ${order.customer_name}, pesanan Hokkaido anda sedang disediakan.\n\nRujukan Order : #${order.id}`,
      ready_pickup: `Hai ${order.customer_name}, pesanan Hokkaido sedia diambil di kedai! 🧁\n\n📍 Alamat Kedai:\nKiosk No 1, Stadium Majlis Perbandaran Manjung, 32040 Seri Manjung, Perak.\n\n🌐 Lokasi Kedai (Google Maps):\nhttps://www.google.com/maps?q=4.1948617,100.6655929\n\nRujukan Order : #${order.id}`,
      delivering: `Hai ${order.customer_name}, rider dalam perjalanan ke lokasi anda.\n\nRujukan Order : #${order.id}`,
      completed: `Terima kasih ${order.customer_name}! Pesanan Hokkaido selesai.\n\nSelamat menikmati Hokkaido anda! 🧀\n\nBoleh kongsikan maklum balas atau feedback anda di sini ya. 😊\n\nRujukan Order : #${order.id}`,
      cancelled: `Hai ${order.customer_name}, Pesanan Hokkaido anda telah dibatalkan.\n\nSebarang pertanyaan lanjut boleh hubungi kami di sini.\n\nRujukan Order : #${order.id}`,
    }
    const template = templates[status]
    if (!template) return ''
    const phone = order.phone_number.replace(/[^0-9]/g, '')
    const encoded = encodeURIComponent(template)
    return `https://wa.me/${phone}?text=${encoded}`
  }
const generateForwardMessage = (order: Order): string => {
    // Product type mapping
    const productLabels: Record<string, string> = {
      solo_sweet: 'Set Solo Sweet (3 pcs)',
      family_box: 'Set Family Box (6 pcs)',
      mega_craving: 'Set Mega Craving (12 pcs)',
    }
    const productLabel = productLabels[order.product_type] || order.product_type

    // Calculate subtotal (unit_price * quantity)
    const subtotal = order.unit_price * order.quantity

    // Build items list
    const itemsList = `${productLabel} × ${order.quantity}: ${formatCurrency(subtotal)}`

    // Build maps URL
    let mapsUrl = ''
    if (order.latitude && order.longitude) {
      mapsUrl = `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
    } else if (order.delivery_address) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
    } else {
      mapsUrl = 'Tiada lokasi'
    }

    // Determine delivery method label
    const deliveryMethod = order.delivery_type === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri'

    // Build the message
    const message = `🍽️ *ORDER HOKKAIDO INTI JEBOK*

🧾 *Order ID:*
${order.id}

👤 *Nama:*
${order.customer_name}

📞 *Telefon:*
${order.phone_number}

📍 *Alamat:*
${order.delivery_address}

🌐 *Google Maps:*
${mapsUrl}

-----------------

🛒 *PESANAN*

${itemsList}

-----------------

Subtotal: ${formatCurrency(subtotal)}
Delivery: ${formatCurrency(order.delivery_fee)}

💰 *JUMLAH: ${formatCurrency(order.total_price)}*

🚚 *Kaedah:*
${deliveryMethod}

Terima kasih.`

    return message
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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Mengesahkan kelayakan...</p>
        </div>
      </div>
    )
  }
  // STRICT RBAC GUARD: Don't render dashboard if still checking auth or RBAC failed
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Mengesahkan kebenaran akses...</p>
        </div>
      </div>
    )
  }

  // STRICT RBAC SAFETY NET: Don't render dashboard if userProfile validation failed
  // This could happen if userProfile is null OR if somehow userRole is not staff/admin
  if (!userProfile) {
    // This should not happen due to earlier redirects, but as a safety net
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
            <p>Pengesahan kebenaran gagal. Sila hubungi pentadbir sistem.</p>
          </div>
          <button 
            onClick={() => router.replace('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Kembali ke Laman Utama
          </button>
        </div>
      </div>
    )
  }

  // Additional safety check: ensure role is staff or admin
  if (userProfile.role !== 'staff' && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
            <p>Anda tidak mempunyai kebenaran untuk mengakses dashboard ini.</p>
            <p className="text-sm mt-2">Peranan anda: {userProfile.role}</p>
          </div>
          <button 
            onClick={() => router.replace('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Kembali ke Laman Utama
          </button>
        </div>
      </div>
    )
  }

  // Only render dashboard for verified 'staff' or 'admin' roles
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="bg-white border-b border-gray-300 px-4 py-4">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Pengurusan Pesanan</h1>
            <p className="text-gray-600">Selamat datang, <strong>{userProfile?.full_name || user?.email || 'Pengurus'}</strong> <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${userProfile?.role === 'admin' ? 'bg-purple-100 text-purple-800' : userProfile?.role === 'staff' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{userProfile?.role ? userProfile.role.toUpperCase() : 'USER'}</span></p>
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
<button onClick={() => setActiveTab('reviews')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-slate-900'}`}>
              <Star className="inline-block h-4 w-4 mr-2" /> Ulasan
            </button>
          </div>
        </div>
        {(activeTab === 'finance' || activeTab === 'ledger' || activeTab === 'reviews') ? (
          (activeTab === 'reviews' ? reviewsLoading : ledgerLoading) ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Memuatkan data...</p>
            </div>
          ) : activeTab === 'finance' ? (
            renderFinanceSection()
          ) : activeTab === 'ledger' ? (
            renderLedgerSection()
          ) : (
            renderReviewsSection()
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
              const forwardLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(generateForwardMessage(order))}`
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
                      <p className="text-gray-500">{order.delivery_type === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p><strong>{order.customer_name}</strong> • {order.phone_number}</p>
                    {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((item: any, idx: number) => {
                        // Extract product name - remove "Hokkaido Inti Jebok - " prefix
                        const fullName = item.name || 'Item';
                        const displayName = fullName.replace('Hokkaido Inti Jebok - ', '');
                        return (
                          <div key={idx} className="mb-1">
                            <div className="text-xs text-gray-500">Hokkaido Inti Jebok</div>
                            <div className="font-semibold text-slate-800">{displayName} × {item.quantity}</div>
                          </div>
                        );
                      })
                    ) : (
                      <p>{order.product_type} × {order.quantity}</p>
                    )}
                    <p>{order.delivery_type === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri'}</p>
                    {order.distance_km && <p>Jarak: {order.distance_km.toFixed(2)} km</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {next && <button onClick={() => updateOrderStatus(order.id, next!)} disabled={actionLoadingId === order.id + '_status_' + next} className={`flex-1 min-w-[140px] py-2 ${actionLoadingId === order.id + '_status_' + next ? 'bg-blue-400 opacity-70 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-medium rounded-lg flex items-center justify-center gap-2`}>{actionLoadingId === order.id + '_status_' + next && <Loader2 className="w-4 h-4 animate-spin" />}Tandai {STATUS_LABELS[next!]}</button>}
                    {whatsappLink && <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"><Phone className="h-4 w-4" /> WhatsApp</a>}
                    <a href={forwardLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"><Share className="h-4 w-4" /> Forward / Kongsi Pesanan</a>
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button onClick={() => cancelOrder(order.id)} disabled={actionLoadingId === order.id + '_cancel'} className={`inline-flex items-center justify-center gap-2 py-2 px-4 ${actionLoadingId === order.id + '_cancel' ? 'bg-red-400 opacity-70 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white font-medium rounded-lg`}>
                        {actionLoadingId === order.id + '_cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Batal Pesanan
                      </button>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">🕒 Sejarah Tindakan:</h4>
                      {(() => {
                        const orderId = order.id // Use full UUID
                        const logs = orderLogsMap[orderId]
                        
                        // Debug: Log what we have
                        console.log(`Sejarah Tindakan for order ${orderId}:`, logs)
                        
                        // Combine initial order creation log with existing logs
                        const allLogs = [
                          // Initial order creation log
                          {
                            id: `initial-${orderId}`,
                            order_id: orderId,
                            action_type: 'order_created',
                            notes: 'Pesanan baharu diterima',
                            created_at: order.created_at,
                            actor_name: 'System',
                            actor_role: 'system'
                          },
                          ...(logs || [])
                        ]
                        
                        // Ensure chronological order
                        const sortedLogs = allLogs.sort((a, b) => {
                          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
                          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
                          return dateA - dateB
                        })
                        
                        if (sortedLogs.length > 0) {
                          return (
                            <div className="space-y-1">
                              {sortedLogs.map(log => {
                                // Determine emoji and label based on action_type
                                let emoji = '📋'
                                let label = log.action_type

                                if (log.action_type === 'status_update') {
                                  emoji = '🔄'
                                  // If notes contains English "Status changed from X to Y", translate to Malay
                                  let notes = log.notes || 'Status Diubah'
                                  if (notes.includes('Status changed from')) {
                                    // Extract new status: pattern "Status changed from X to Y"
                                    const match = notes.match(/Status changed from \w+ to (\w+)/)
                                    if (match) {
                                      const newStatus = match[1] as OrderStatus
                                      const malayStatus = STATUS_LABELS[newStatus] || newStatus
                                      label = `Status ditukar kepada ${malayStatus}`
                                    } else {
                                      label = 'Status Diubah'
                                    }
                                  } else {
                                    // Use Malay notes as is
                                    label = notes
                                  }
                                } else if (log.action_type === 'order_cancelled' || log.action_type === 'cancellation') {
                                  emoji = '❌'
                                  label = 'Pesanan dibatalkan'
                                } else if (log.action_type === 'order_completed') {
                                  emoji = '✅'
                                  label = 'Selesai'
                                } else if (log.action_type === 'order_created') {
                                  emoji = '📝'
                                  label = 'Pesanan baharu diterima'
                                } else if (log.action_type === 'payment_received') {
                                  emoji = '💰'
                                  label = 'Bayaran Diterima'
                                } else if (log.action_type === 'delivery_assigned') {
                                  emoji = '🚚'
                                  label = 'Penghantaran Ditugaskan'
                                }
                                
                                // Format date and time
                                const date = new Date(log.created_at)
                                const formattedDate = date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })
                                const formattedTime = date.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })
                                
                                // Use actor_name and actor_role from log data
                                const actorName = log.actor_name || 'Anam Azizi'
                                const actorRole = log.actor_role || 'admin'
                                
                                return (
                                  <div key={log.id} className="text-xs text-gray-600">
                                    {emoji} {label} oleh {actorName} ({actorRole}) pada {formattedDate}, {formattedTime}
                                  </div>
                                )
                              })}
                            </div>
                           )
                         }
                        })()}
                    </div>
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
