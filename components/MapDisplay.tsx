import { MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { formatCurrency } from '@/lib/utils'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

interface MapDisplayProps {
  storeLat: number
  storeLng: number
  selectedLat: number | null
  selectedLng: number | null
  distance: number
  deliveryFee: number
  onMapClick: (lat: number, lng: number) => void
}

export default function MapDisplay({
  storeLat,
  storeLng,
  selectedLat,
  selectedLng,
  distance,
  deliveryFee,
  onMapClick,
}: MapDisplayProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <MapPin className="mr-2 h-5 w-5" />
        Pilih Lokasi Penghantaran
      </h3>
      <p className="text-gray-600 mb-4">
        Klik pada peta untuk tetapkan lokasi anda. Caj penghantaran akan dikira automatik berdasarkan jarak.
      </p>
      <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
        <Map
          storeLat={storeLat}
          storeLng={storeLng}
          selectedLat={selectedLat}
          selectedLng={selectedLng}
          onMapClick={onMapClick}
        />
      </div>
      {selectedLat && selectedLng && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div>Koordinat dipilih: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</div>
          <div className="font-medium">Caj penghantaran: {formatCurrency(deliveryFee)}</div>
        </div>
      )}
    </div>
  )
}