import { CreditCard } from 'lucide-react'
import { getProductDetails, formatCurrency } from '@/lib/utils'

interface ProductSelectionProps {
  productType: 'solo_sweet' | 'family_box' | 'mega_craving'
  setProductType: (type: 'solo_sweet' | 'family_box' | 'mega_craving') => void
  quantity: number
  setQuantity: (qty: number) => void
}

const productOptions = [
  { value: 'solo_sweet', label: 'Set Solo Sweet (3 biji)', price: 4.5 },
  { value: 'family_box', label: 'Set Family Box (12 biji)', price: 18.0 },
  { value: 'mega_craving', label: 'Set Mega Craving (25 biji)', price: 30.0 },
]

export default function ProductSelection({ productType, setProductType, quantity, setQuantity }: ProductSelectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <CreditCard className="mr-2 h-5 w-5" />
        Pilihan Tart
      </h3>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {productOptions.map((product) => (
          <div
            key={product.value}
            className={`p-4 border rounded-lg cursor-pointer ${productType === product.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onClick={() => setProductType(product.value as any)}
          >
            <div className="font-medium">{product.label}</div>
            <div className="text-lg font-bold text-blue-700">{formatCurrency(product.price)}</div>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Kuantiti</label>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            –
          </button>
          <span className="text-xl font-bold">{quantity}</span>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}