import { getProductDetails, formatCurrency } from '@/lib/utils'

interface OrderSummaryProps {
  productType: 'solo_sweet' | 'family_box' | 'mega_craving'
  quantity: number
  deliveryType: 'pickup' | 'delivery'
  distance: number
  deliveryFee: number
  totalPrice: number
}

export default function OrderSummary({
  productType,
  quantity,
  deliveryType,
  distance,
  deliveryFee,
  totalPrice,
}: OrderSummaryProps) {
  return (
    <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-300">
      <h3 className="text-xl font-semibold mb-4">Ringkasan Pesanan</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Produk:</span>
          <span className="font-medium">{getProductDetails(productType).name} × {quantity}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(getProductDetails(productType).price * quantity)}</span>
        </div>
        {deliveryType === 'delivery' && (
          <>
            <div className="flex justify-between">
              <span>Jarak:</span>
              <span>{distance.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between">
              <span>Caj penghantaran:</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          </>
        )}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-bold text-lg">
            <span>Jumlah Tuntut Tunai (COD):</span>
            <span className="text-green-700">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}