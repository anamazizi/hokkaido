import { getProductDetails, formatCurrency } from '@/lib/utils'

type ProductKey = 'solo_sweet' | 'family_box' | 'mega_craving'

interface OrderSummaryProps {
  quantities: Record<ProductKey, number>
  deliveryType: 'pickup' | 'delivery'
  distance: number
  deliveryFee: number
  totalPrice: number
}

const productOptions = [
  { 
    key: 'solo_sweet' as ProductKey, 
    brandName: 'Hokkaido Inti Jebok',
    productName: 'Set Solo Sweet (3 pcs)',
    price: 4.5 
  },
  { 
    key: 'family_box' as ProductKey, 
    brandName: 'Hokkaido Inti Jebok',
    productName: 'Set Family Box (12 pcs)',
    price: 18.0 
  },
  { 
    key: 'mega_craving' as ProductKey, 
    brandName: 'Hokkaido Inti Jebok',
    productName: 'Set Mega Craving (25 pcs)',
    price: 30.0 
  },
]

export default function OrderSummary({
  quantities,
  deliveryType,
  distance,
  deliveryFee,
  totalPrice,
}: OrderSummaryProps) {
  const selectedItems = productOptions.filter(product => quantities[product.key] > 0)
  const subtotal = selectedItems.reduce((sum, product) => sum + (product.price * quantities[product.key]), 0)

  return (
    <div className="mb-8 bg-gradient-to-r from-amber-50/30 to-orange-50/20 p-6 rounded-xl border border-amber-200/60 shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-slate-900">Ringkasan Pesanan</h3>
      <div className="space-y-2">
        {selectedItems.length === 0 ? (
          <div className="text-slate-500 italic">Tiada produk dipilih. Sila pilih sekurang-kurangnya satu set.</div>
        ) : (
          <>
            {selectedItems.map((product) => (
              <div key={product.key}>
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm text-slate-600">{product.brandName}</div>
                    <div className="text-slate-700">{product.productName}:</div>
                  </div>
                  <span className="font-medium text-slate-900">{quantities[product.key]} × {formatCurrency(product.price)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-slate-700">Subtotal:</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
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
                <span className="text-slate-900">Jumlah:</span>
                <span className="text-green-700">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}