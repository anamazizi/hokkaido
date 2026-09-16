'use client'

import { ShoppingCart, Phone } from 'lucide-react'
import useOrderForm from '@/lib/useOrderForm'
import { supabase } from '@/lib/supabase'
import { getProductDetails, formatCurrency, sanitizePhone } from '@/lib/utils'
import CustomerForm from '@/components/CustomerForm'
import ProductSelection from '@/components/ProductSelection'
import DeliveryMethod from '@/components/DeliveryMethod'
import MapDisplay from '@/components/MapDisplay'
import OrderSummary from '@/components/OrderSummary'

export default function Home() {
  const {
    name, setName, phone, setPhone,
    address, setAddress,
    deliveryType, setDeliveryType,
    productType, setProductType,
    quantity, setQuantity,
    selectedLat, setSelectedLat, selectedLng, setSelectedLng, distance, deliveryFee, totalPrice,
    isSubmitting, setIsSubmitting,
    orderId, setOrderId,
    whatsappLink, setWhatsappLink,
    saveCustomerDataToLocalStorage,
    handleMapClick,
  } = useOrderForm()

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
    setIsSubmitting(true)
    try {
      const product = getProductDetails(productType)
      const totalCogs = product.cogs * quantity
      const profit = totalPrice - totalCogs - deliveryFee
      const deliveryAddress = deliveryType === 'delivery' 
        ? address.trim() || `Lat: ${selectedLat?.toFixed(6)}, Lng: ${selectedLng?.toFixed(6)}`
        : 'Ambil sendiri di kedai'
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
        })
      if (error) {
        console.error('Supabase Error Details:', error)
        console.error('Supabase Error Code:', error.code)
        console.error('Supabase Error Message:', error.message)
        console.error('Supabase Error Details:', error.details)
        console.error('Supabase Error Hint:', error.hint)
        throw new Error(`Gagal menyimpan pesanan: ${error.message}`)
      }
      setOrderId(orderId)
      saveCustomerDataToLocalStorage()
      
      // Prepare variables for WhatsApp message template
      const phoneFormatted = sanitizePhone(phone)
      const deliveryMethodText = deliveryType === 'delivery' ? 'Penghantaran COD' : 'Ambil Sendiri di Kedai'
      const googleMapsUrl = deliveryType === 'delivery' && selectedLat && selectedLng 
        ? `https://www.google.com/maps?q=${selectedLat},${selectedLng}`
        : ''
      
      const itemTotal = product.price * quantity
      const subtotal = itemTotal
      const grandTotal = totalPrice
      
      const message = `🍽️ *ORDER HOKKAIDO INTI JEBOK*\n\n🧾 *Order ID:*\n${orderId}\n\n👤 *Nama:*\n${name}\n\n📞 *Telefon:*\n${phoneFormatted}\n\n📍 *Alamat:*\n${deliveryAddress}\n${googleMapsUrl ? `\n🌐 *Google Maps:*\n${googleMapsUrl}\n` : ''}\n\n--------------------\n\n🛒 *PESANAN*\n\n${quantity}x ${product.name} - ${formatCurrency(itemTotal)}\n\n--------------------\n\nSubtotal: ${formatCurrency(subtotal)}\nDelivery: ${formatCurrency(deliveryFee)}\n\n💰 *JUMLAH: ${formatCurrency(grandTotal)}*\n\n🚚 *Kaedah:*\n${deliveryMethodText}\n\nTerima kasih.`
      
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
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Tempah Hokkaido Inti Jebok</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">- Kek Muffin Inti Custard -</p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-2">Gebu di luar, creamy di dalam. Inti kastard penuh melimpah!</p>
      </div>
      <div className="mb-10 rounded-xl overflow-hidden shadow-lg border border-gray-300">
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-amber-100 to-yellow-200 flex items-center justify-center">
          <div className="text-center p-6">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Hokkaido Inti Jebok</h2>
            <p className="text-lg text-slate-700">- Kek Muffin Inti Custard -</p>
            <p className="text-slate-600 mt-4">Gebu di luar, creamy di dalam. Inti kastard penuh melimpah!</p>
          </div>
          {/* Fallback image placeholder */}
          <img 
            src="/images/hokkaido-banner.jpg" 
            alt="Hokkaido Inti Jebok Banner" 
            className="absolute inset-0 w-full h-full object-cover opacity-20"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>

      {/* Product Showcase */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-300 p-4 shadow-sm">
          <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
            <img 
              src="/images/hokkaido-sets.jpg" 
              alt="Hokkaido Sets" 
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="text-slate-700 text-center p-4">
              <div className="text-2xl font-bold">Set Family Box</div>
              <div className="text-lg">12 pcs • RM 18.00</div>
            </div>
          </div>
          <h3 className="font-bold text-lg text-slate-900">Set Kombo Keluarga</h3>
          <p className="text-slate-600 text-sm">Perfect untuk family gathering, majlis kecil.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-300 p-4 shadow-sm">
          <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
            <img 
              src="/images/hokkaido-cream.jpg" 
              alt="Hokkaido Cream" 
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="text-slate-700 text-center p-4">
              <div className="text-2xl font-bold">Set Mega Craving</div>
              <div className="text-lg">25 pcs • RM 30.00</div>
            </div>
          </div>
          <h3 className="font-bold text-lg text-slate-900">Set Mega Craving</h3>
          <p className="text-slate-600 text-sm">Untuk event besar, jamuan rakan sekerja.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-300 p-4 shadow-sm">
          <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
            <div className="text-slate-700 text-center p-4">
              <div className="text-2xl font-bold">Set Solo Sweet</div>
              <div className="text-lg">3 pcs • RM 4.50</div>
            </div>
          </div>
          <h3 className="font-bold text-lg text-slate-900">Set Solo Sweet</h3>
          <p className="text-slate-600 text-sm">Cuba rasa, nikmati sendiri atau berkongsi dengan seorang.</p>
        </div>
      </div>
<form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-300 mb-10">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <ShoppingCart className="mr-3 h-7 w-7 text-blue-600" />
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
                setProductType('solo_sweet')
                setQuantity(1)
                setSelectedLat(null)
                setSelectedLng(null)
              }}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Padam maklumat tersimpan
            </button>
          </div>
        )}
        <ProductSelection productType={productType} setProductType={setProductType} quantity={quantity} setQuantity={setQuantity} />
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
          productType={productType}
          quantity={quantity}
          deliveryType={deliveryType}
          distance={distance}
          deliveryFee={deliveryFee}
          totalPrice={totalPrice}
        />

        <button
          type="submit"
          disabled={isSubmitting || (deliveryType === 'delivery' && (!selectedLat || !selectedLng || !address.trim()))}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
        >
          {isSubmitting ? 'Menghantar...' : 'Hantar Pesanan'}
        </button>
      </form>

      {orderId && (
        <div className="bg-green-50 p-6 rounded-xl border border-green-300 mb-10">
          <h3 className="text-2xl font-bold mb-4 text-green-800">Pesanan Berjaya Dihantar!</h3>
          <p className="mb-6">Pesanan anda telah direkod dengan ID: <strong>{orderId}</strong>.</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg">
            <Phone className="mr-3 h-5 w-5" />
            Hantar Notifikasi via WhatsApp
          </a>
        </div>
      )}

      <div className="bg-gray-50 p-8 rounded-xl border border-gray-300">
        <h2 className="text-2xl font-bold mb-4">Maklumat Penting</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-2">
          <li>Semua harga adalah dalam Ringgit Malaysia (RM).</li>
          <li>Untuk penghantaran: Caj asas RM 3.00 untuk 0–3 km, setiap km seterusnya +RM 1.00.</li>
          <li>Tiada pendaftaran akaun diperlukan – terus isi borang dan bayar tunai.</li>
          <li>Pesanan akan diproses dalam masa 30 minit selepas notifikasi WhatsApp dihantar.</li>
          <li>Hubungi +601110890100 jika ada sebarang pertanyaan.</li>
        </ul>
      </div>
    </div>
  )
}