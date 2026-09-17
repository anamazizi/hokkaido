import { CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type ProductKey = 'solo_sweet' | 'family_box' | 'mega_craving'

interface ProductSelectionProps {
  quantities: Record<ProductKey, number>
  setQuantities: (quantities: Record<ProductKey, number>) => void
}

const productOptions = [
  { 
    key: 'solo_sweet' as ProductKey, 
    title: 'Hokkaido Inti Jebok',
    name: 'Set Solo Sweet (3 biji)', 
    price: 5.0 
  },
  { 
    key: 'family_box' as ProductKey, 
    title: 'Hokkaido Inti Jebok',
    name: 'Set Family Box (12 biji)', 
    price: 18.0 
  },
  { 
    key: 'mega_craving' as ProductKey, 
    title: 'Hokkaido Inti Jebok',
    name: 'Set Mega Craving (25 biji)', 
    price: 30.0 
  },
]

export default function ProductSelection({ quantities, setQuantities }: ProductSelectionProps) {
  const handleIncrement = (key: ProductKey) => {
    setQuantities({
      ...quantities,
      [key]: quantities[key] + 1
    })
  }

  const handleDecrement = (key: ProductKey) => {
    if (quantities[key] > 0) {
      setQuantities({
        ...quantities,
        [key]: quantities[key] - 1
      })
    }
  }

  const handleInputChange = (key: ProductKey, value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0) {
      setQuantities({
        ...quantities,
        [key]: num
      })
    } else if (value === '') {
      setQuantities({
        ...quantities,
        [key]: 0
      })
    }
  }

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <CreditCard className="mr-2 h-5 w-5" />
        Pilihan Tart
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {productOptions.map((product) => (
          <div
            key={product.key}
            className={`p-4 border rounded-lg ${quantities[product.key] > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <div className="mb-2">
              <div className="font-medium text-slate-700 text-sm">{product.title}</div>
              <div className="font-bold text-slate-900 text-lg">{product.name}</div>
              <div className="font-semibold text-blue-600">{formatCurrency(product.price)}</div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                className="px-3 py-1 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleDecrement(product.key)}
                disabled={quantities[product.key] <= 0}
              >
                –
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="w-16 text-center p-2 border border-gray-300 rounded-lg text-slate-900 bg-white"
                value={quantities[product.key]}
                onChange={(e) => handleInputChange(product.key, e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-1 border border-gray-300 rounded-lg bg-gray-100 hover:bg-gray-200"
                onClick={() => handleIncrement(product.key)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}