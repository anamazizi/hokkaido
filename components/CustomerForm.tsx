import { User } from 'lucide-react'
import { digitsOnly } from '@/lib/utils'

interface CustomerFormProps {
  name: string
  setName: (name: string) => void
  phone: string
  setPhone: (phone: string) => void
  deliveryType: 'pickup' | 'delivery'
}

export default function CustomerForm({ name, setName, phone, setPhone, deliveryType }: CustomerFormProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <User className="mr-2 h-5 w-5" />
        Maklumat Pelanggan
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nama Penuh</label>
          <input
            type="text"
            required
            className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400"
            placeholder="Nama anda"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombor Telefon</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-slate-700">
              +6
            </span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="flex-1 p-3 border border-gray-300 rounded-r-lg text-slate-900 bg-white placeholder:text-gray-400"
              placeholder="01XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value))}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Hanya nombor lokal (cth: 01110890100 atau 1110890100)</p>
        </div>
      </div>
    </div>
  )
}