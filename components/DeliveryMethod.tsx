import { Truck } from 'lucide-react'

interface DeliveryMethodProps {
  deliveryType: 'pickup' | 'delivery'
  setDeliveryType: (type: 'pickup' | 'delivery') => void
}

export default function DeliveryMethod({ deliveryType, setDeliveryType }: DeliveryMethodProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <Truck className="mr-2 h-5 w-5" />
        Kaedah Terima
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div
          className={`p-4 border rounded-lg cursor-pointer ${deliveryType === 'pickup' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
          onClick={() => setDeliveryType('pickup')}
        >
          <div className="font-medium">Ambil Sendiri di Kedai</div>
        </div>
        <div
          className={`p-4 border rounded-lg cursor-pointer ${deliveryType === 'delivery' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
          onClick={() => setDeliveryType('delivery')}
        >
          <div className="font-medium">Penghantaran</div>
        </div>
      </div>
    </div>
  )
}