'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ShoppingCart, Phone, MessageCircle, HelpCircle } from 'lucide-react'
import useOrderForm from '@/lib/useOrderForm'
import { supabase } from '@/lib/supabase'
import { getProductDetails, formatCurrency, sanitizePhone } from '@/lib/utils'
import CustomerForm from '@/components/CustomerForm'
import ProductSelection from '@/components/ProductSelection'
import DeliveryMethod from '@/components/DeliveryMethod'
import OrderSummary from '@/components/OrderSummary'

const MapDisplay = dynamic(() => import('@/components/MapDisplay'), {
  ssr: false,
  loading: () => <div className="h-64 bg-amber-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400">Memuatkan peta...</div>
})

export default function Home() {
  const {
    name, setName, phone, setPhone,
    address, setAddress,
    deliveryType, setDeliveryType,
    quantities, setQuantities,
    selectedLat, setSelectedLat, selectedLng, setSelectedLng, distance, deliveryFee, totalPrice,
    isSubmitting, setIsSubmitting,
    orderId, setOrderId,
    whatsappLink, setWhatsappLink,
    saveCustomerDataToLocalStorage,
    handleMapClick,
  } = useOrderForm()
// State for inquiry form
  const [inquiryName, setInquiryName] = useState('')
  const [inquiryQuestion, setInquiryQuestion] = useState('')
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false)

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inquiryName.trim() || !inquiryQuestion.trim()) {
      alert('Sila isi nama dan pertanyaan anda.')
      return
    }
    setIsInquirySubmitting(true)
    
    const message = `Hai Hokkaido Inti Jebok,\n\nNama: ${inquiryName.trim()}\nPertanyaan: ${inquiryQuestion.trim()}`
    const phoneNumber = '+601110890100'
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    
    if (typeof window !== 'undefined') {
      window.location.href = whatsappUrl
      setTimeout(() => setIsInquirySubmitting(false), 1000)
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validation
    if (deliveryType === 'delivery') {
      if (!selectedLat || !selectedLng) {
        alert('Sila pilih lokasi penghantaran di peta.')
        return
      }
      if (!address.trim()) {
        alert('Sila isi alamat penghantaran (No. Rumah / Jalan / Bangunan).')
        return
      }
    }
    // Validate at least one product selected
    const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
    if (totalQuantity === 0) {
      alert('Sila pilih sekurang-kurangnya satu set produk.')
      return
    }
    setIsSubmitting(true)
    try {
      // Calculate product details for selected items
      const productDetails = {
        solo_sweet: getProductDetails('solo_sweet'),
        family_box: getProductDetails('family_box'),
        mega_craving: getProductDetails('mega_craving'),
      }

      let totalCogs = 0
      let totalProfit = 0
      const selectedItems: Array<{ 
        key: string, 
        name: string, 
        quantity: number, 
        price: number, 
        cogs: number, 
        profit: number 
      }> = []

      Object.entries(quantities).forEach(([key, qty]) => {
        if (qty > 0) {
          const product = productDetails[key as keyof typeof productDetails]
          totalCogs += product.cogs * qty
          totalProfit += product.profit * qty
          selectedItems.push({ 
            key, 
            name: product.name, 
            quantity: qty, 
            price: product.price,
            cogs: product.cogs,
            profit: product.profit
          })
        }
      })

      // For backward compatibility with existing database schema,
      // we still store a primary product type and quantity.
      // We'll use the first selected item as primary.
      const primaryProduct = selectedItems[0]
      const productType = primaryProduct.key
      const quantity = primaryProduct.quantity
      const product = productDetails[productType as keyof typeof productDetails]
      const profit = totalPrice - totalCogs - deliveryFee
      const storeAddress = 'Kiosk No 1, Stadium Majlis Perbandaran Manjung, 32040 Seri Manjung, Perak.'
      const storeMapsUrl = 'https://www.google.com/maps?q=4.1948617,100.6655929'
      const deliveryAddress = deliveryType === 'delivery' 
        ? address.trim() || `Lat: ${selectedLat?.toFixed(6)}, Lng: ${selectedLng?.toFixed(6)}`
        : storeAddress
// Jana UUID di peringkat klien untuk elakkan RLS SELECT violation
      const orderId = typeof window !== 'undefined' && window.crypto
        ? window.crypto.randomUUID()
        : crypto.randomUUID()
// Log payload untuk debug
      console.log('Payload untuk Supabase:', {
        id: orderId,
        customer_name: name,
        phone_number: sanitizePhone(phone),
        delivery_address: deliveryAddress,
        delivery_type: deliveryType,
        latitude: selectedLat,
        longitude: selectedLng,
        distance_km: distance,
        delivery_fee: deliveryFee,
        product_type: productType,
        quantity,
        unit_price: product.price,
        total_price: totalPrice,
        cogs: totalCogs,
        net_profit: profit,
        status: 'pending',
      })
      // Format itemsPayload untuk menyimpan semua item yang dipilih
      const itemsPayload = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([key, qty]) => {
          const product = productDetails[key as keyof typeof productDetails];
          return {
            key,
            name: product.name,
            quantity: qty,
            price: product.price,
            cogs: product.cogs,
            profit: product.profit
          };
        });

      const { error } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_name: name,
          phone_number: sanitizePhone(phone),
          delivery_address: deliveryAddress,
          delivery_type: deliveryType,
          latitude: selectedLat,
          longitude: selectedLng,
          distance_km: distance,
          delivery_fee: deliveryFee,
          product_type: productType,
          quantity,
          unit_price: product.price,
          total_price: totalPrice,
          cogs: totalCogs,
          net_profit: profit,
          status: 'pending',
          items: itemsPayload
        })
      if (error) {
        console.error('Supabase Error Details:', error)
        console.error('Supabase Error Code:', error.code)
        console.error('Supabase Error Message:', error.message)
        console.error('Supabase Error Details:', error.details)
        console.error('Supabase Error Hint:', error.hint)
        throw new Error(`Gagal menyimpan pesanan: ${error.message}`)
      }
      
      // Log order creation in order_logs table
      try {
        const { error: logErr } = await supabase.from('order_logs').insert({
          order_id: orderId,
          actor_name: 'System',
          actor_role: 'system',
          action_type: 'order_created',
          notes: 'Pesanan baru dibuat melalui storefront'
        })
        if (logErr) {
          console.error('Gagal simpan order_log (created):', logErr)
          console.error('Payload order_log (created):', {
            order_id: orderId,
            actor_name: 'System',
            actor_role: 'system',
            action_type: 'order_created',
            notes: 'Pesanan baru dibuat melalui storefront'
          })
        }
      } catch (logError) {
        console.error('Error logging order creation:', logError)
        // Continue anyway, don't fail the order creation
      }
      
      setOrderId(orderId)
      saveCustomerDataToLocalStorage()
      
      // Prepare variables for WhatsApp message template
      const phoneFormatted = sanitizePhone(phone)
      const deliveryMethodText = deliveryType === 'delivery' ? 'Penghantaran COD' : 'Ambil Sendiri di Kedai'
      const googleMapsUrl = deliveryType === 'delivery' && selectedLat && selectedLng 
        ? `https://www.google.com/maps?q=${selectedLat},${selectedLng}`
        : storeMapsUrl
      
      // Build order items list for WhatsApp message
      const orderItemsText = selectedItems.map(item => 
        `${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`
      ).join('\n')

      const subtotal = totalPrice - deliveryFee
      const grandTotal = totalPrice

      const googleMapsPart = googleMapsUrl ? `\n🌐 *Google Maps:*\n${googleMapsUrl}\n` : ''
      const message = `🍽️ *ORDER HOKKAIDO INTI JEBOK*\n\n🧾 *Order ID:*\n${orderId}\n\n👤 *Nama:*\n${name}\n\n📞 *Telefon:*\n${phoneFormatted}\n\n📍 *Alamat:*\n${deliveryAddress}\n${googleMapsUrl ? `\n🌐 *Google Maps:*\n${googleMapsUrl}\n` : ''}\n\n--------------------\n\n🛒 *PESANAN*\n\n${orderItemsText}\n\n--------------------\n\nSubtotal: ${formatCurrency(subtotal)}\nDelivery: ${formatCurrency(deliveryFee)}\n\n💰 *JUMLAH: ${formatCurrency(grandTotal)}*\n\n🚚 *Kaedah:*\n${deliveryMethodText}\n\nTerima kasih.`
      
      const encoded = encodeURIComponent(message)
      const phoneNumber = '+601110890100'
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encoded}`
      setWhatsappLink(whatsappUrl)
      
      // Direct redirect to WhatsApp without popup
      if (typeof window !== 'undefined') {
        window.location.href = whatsappUrl
      }
    } catch (error) {
      console.error('Error dalam handleSubmit:', error)
      alert(`Ralat menghantar pesanan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-amber-50 via-orange-50/30 to-white min-h-screen text-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with clean images */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-3">Hokkaido Inti Jebok</h1>
          <p className="text-lg text-gray-600 text-center mb-2">- Kek Muffin Inti Custard -</p>
          <p className="text-lg text-gray-500 text-center">Gebu di luar, creamy di dalam. Inti kastard penuh melimpah!</p>
        </div>

        {/* Main Banner Image */}
        <div className="mb-10">
          <img 
            src="/images/hokkaido-banner.jpg" 
            alt="Hokkaido Inti Jebok Banner" 
            className="w-full h-auto rounded-2xl shadow-sm block border border-amber-200"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Product Images Gallery */}
        <div className="mb-10">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-200">
            <img 
              src="/images/hokkaido-cream.jpg" 
              alt="Hokkaido Cream Texture" 
              className="w-full h-auto rounded-2xl shadow-sm block"
loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </div>
{/* Order Form */}
        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur border border-amber-200/60 shadow-md rounded-2xl p-5 mb-6 text-slate-900">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <ShoppingCart className="mr-3 h-7 w-7 text-amber-600" />
            Maklumat Pesanan
          </h2>

          <CustomerForm name={name} setName={setName} phone={phone} setPhone={setPhone} address={address} setAddress={setAddress} deliveryType={deliveryType} />
          {typeof window !== 'undefined' && localStorage.getItem('hokkaido_customer_data') && (
            <div className="mb-4 text-right">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('hokkaido_customer_data')
                  setName('')
                  setPhone('')
                  setDeliveryType('pickup')
                  setQuantities({ solo_sweet: 0, family_box: 0, mega_craving: 0 })
                  setSelectedLat(null)
                  setSelectedLng(null)
                }}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Padam maklumat tersimpan
              </button>
            </div>
          )}
          <ProductSelection quantities={quantities} setQuantities={setQuantities} />
          <DeliveryMethod deliveryType={deliveryType} setDeliveryType={setDeliveryType} />
          
          {deliveryType === 'delivery' && (
            <MapDisplay
              storeLat={4.1948617}
              storeLng={100.6655929}
              selectedLat={selectedLat}
              selectedLng={selectedLng}
              distance={distance}
              deliveryFee={deliveryFee}
              onMapClick={handleMapClick}
            />
          )}

          <OrderSummary
            quantities={quantities}
            
            deliveryType={deliveryType}
            distance={distance}
            deliveryFee={deliveryFee}
            totalPrice={totalPrice}
          />

          <button
            type="submit"
            disabled={isSubmitting || (deliveryType === 'delivery' && (!selectedLat || !selectedLng || !address.trim()))}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition shadow-md"
          >
            {isSubmitting ? 'Menghantar...' : 'Hantar Pesanan'}
          </button>
        </form>

      {orderId && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50/50 p-6 rounded-2xl border border-green-300 mb-10 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-4 text-green-800">Pesanan Berjaya Dihantar!</h3>
            <p className="mb-6">Pesanan anda telah direkod dengan ID: <strong>{orderId}</strong>.</p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md">
              <Phone className="mr-3 h-5 w-5" />
              Hantar Notifikasi via WhatsApp
            </a>
          </div>
        )}

        {/* Inquiry Form */}
        <div className="bg-white/90 backdrop-blur border border-blue-200/60 shadow-md rounded-2xl p-5 mb-6">
          <div className="flex items-center mb-6">
            <HelpCircle className="mr-3 h-7 w-7 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tiada pendaftaran akaun diperlukan</h2>
              <p className="text-slate-600">Hanya isi borang di atas dan hantar pesanan terus ke WhatsApp kami.</p>
            </div>
          </div>
          
          <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-200/40">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-blue-800">
              <MessageCircle className="mr-2 h-5 w-5" />
              Tanya Kami di WhatsApp
            </h3>
            
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Anda</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nama anda"
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pertanyaan Anda</label>
                <textarea
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Berapa lama masa untuk delivery? Boleh order untuk esok?"
                  rows={3}
                  value={inquiryQuestion}
                  onChange={(e) => setInquiryQuestion(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isInquirySubmitting}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center"
              >
                <MessageCircle className="mr-3 h-5 w-5" />
                {isInquirySubmitting ? 'Mengirim...' : 'Tanya Kami di WhatsApp'}
              </button>
            </form>
            
            
          </div>
        </div>
      </div>
    </div>
)
}