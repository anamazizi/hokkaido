import { useState, useEffect } from 'react'
import { calculateDistance, calculateDeliveryFee, getProductDetails } from '@/lib/utils'

const STORE_LAT = 4.1948617
const STORE_LNG = 100.6655929

type ProductKey = 'solo_sweet' | 'family_box' | 'mega_craving'

export default function useOrderForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
  const [quantities, setQuantities] = useState<Record<ProductKey, number>>({
    solo_sweet: 0,
    family_box: 0,
    mega_craving: 0,
  })
  const [selectedLat, setSelectedLat] = useState<number | null>(null)
  const [selectedLng, setSelectedLng] = useState<number | null>(null)
  const [distance, setDistance] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')

  // Calculate subtotal from quantities
  const calculateSubtotal = () => {
    let subtotal = 0
    Object.entries(quantities).forEach(([key, qty]) => {
      if (qty > 0) {
        const product = getProductDetails(key)
        subtotal += product.price * qty
      }
    })
    return subtotal
  }

  // Calculate total price based on subtotal and delivery fee
  useEffect(() => {
    const subtotal = calculateSubtotal()
    let calculatedDistance = 0
    let calculatedDeliveryFee = 0
    
    if (deliveryType === 'delivery' && selectedLat && selectedLng) {
      calculatedDistance = calculateDistance(STORE_LAT, STORE_LNG, selectedLat, selectedLng)
      calculatedDeliveryFee = calculateDeliveryFee(calculatedDistance)
    }
    
    setDistance(calculatedDistance)
    setDeliveryFee(calculatedDeliveryFee)
    setTotalPrice(subtotal + calculatedDeliveryFee)
  }, [quantities, deliveryType, selectedLat, selectedLng])

  // Load customer data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('hokkaido_customer_data')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.name) setName(data.name)
        if (data.phone) setPhone(data.phone)
        if (data.address) setAddress(data.address)
        if (data.deliveryType) setDeliveryType(data.deliveryType)
        if (data.quantities) setQuantities(data.quantities)
        if (data.selectedLat) setSelectedLat(data.selectedLat)
        if (data.selectedLng) setSelectedLng(data.selectedLng)
      } catch (e) {
        console.error('Failed to parse stored customer data', e)
      }
    }
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLat(lat)
    setSelectedLng(lng)
  }

  const saveCustomerDataToLocalStorage = () => {
    if (typeof window === 'undefined') return
    const data = {
      name,
      phone,
      address,
      deliveryType,
      quantities,
      selectedLat,
      selectedLng,
    }
    localStorage.setItem('hokkaido_customer_data', JSON.stringify(data))
  }

  return {
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    deliveryType,
    setDeliveryType,
    quantities,
    setQuantities,
    selectedLat,
    setSelectedLat,
    selectedLng,
    setSelectedLng,
    distance,
    deliveryFee,
    totalPrice,
    isSubmitting,
    setIsSubmitting,
    orderId,
    setOrderId,
    whatsappLink,
    setWhatsappLink,
    handleMapClick,
    saveCustomerDataToLocalStorage,
  }
}