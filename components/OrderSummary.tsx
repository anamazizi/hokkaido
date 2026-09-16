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
    <div className="mb-8 bg-gradient-to-r from-amber-50/30 to-orange-50/20 p-6 rounded-xl border border-amber-200/60 shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-slate-900">Ringkasan Pesanan</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-700">Produk:</span>
          <span className="font-medium text-slate-900">{getProductDetails(productType).name} × {quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700">Subtotal:</span>
          <span className="font-medium text-slate-900">{formatCurrency(getProductDetails(productType).price * quantity)}</span>
        </div>
        {deliveryType === 'delivery' && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-700">Caj penghantaran:</span>
              <span className="font-medium text-slate-900">{formatCurrency(deliveryFee)}</span>
            </div>
          </>
        )}
        <div className="border-t border-amber-200/40 pt-3 mt-3">
          <div className="flex justify-between font-bold text-lg">
            <span className="text-slate-900">Jumlah Tuntut Tunai (COD):</span>
            <span className="text-green-700">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}