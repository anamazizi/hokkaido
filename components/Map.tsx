'use client'

import { useEffect, useState } from 'react'

interface MapProps {
  storeLat: number
  storeLng: number
  selectedLat: number | null
  selectedLng: number | null
  onMapClick: (lat: number, lng: number) => void
}

// Dynamic imports will be stored here
type LeafletModules = {
  MapContainer: any
  TileLayer: any
  Marker: any
  Popup: any
  useMapEvents: any
  L: any
}

export default function Map({ storeLat, storeLng, selectedLat, selectedLng, onMapClick }: MapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [leafletModules, setLeafletModules] = useState<LeafletModules | null>(null)

  useEffect(() => {
    setIsMounted(true)
    
    if (typeof window === 'undefined') return

    Promise.all([
      import('leaflet'),
      import('react-leaflet')
    ]).then(([leaflet, reactLeaflet]) => {
      const L = leaflet.default || leaflet
      const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = reactLeaflet
      
      // Configure Leaflet icon
      delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      
      setLeafletModules({
        MapContainer,
        TileLayer,
        Marker,
        Popup,
        useMapEvents,
        L
      })
    }).catch(error => {
      console.error('Failed to load Leaflet modules:', error)
    })
  }, [])

  if (!isMounted || !leafletModules) {
    return (
      <div className="h-full w-full bg-amber-50 rounded-xl flex items-center justify-center text-slate-400">
        Memuatkan peta...
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = leafletModules

  function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
      click(e: any) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      },
    })
    return null
  }

  return (
    <MapContainer
      center={[storeLat, storeLng]}
      zoom={13}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <ClickHandler onMapClick={onMapClick} />
      
      {/* Store Marker */}
      <Marker position={[storeLat, storeLng]}>
        <Popup>
          <div className="font-bold">Kedai Hokkaido Cheese Tart</div>
          <div>Koordinat: {storeLat.toFixed(6)}, {storeLng.toFixed(6)}</div>
        </Popup>
      </Marker>
      
      {/* Selected Location Marker */}
      {selectedLat && selectedLng && (
        <Marker position={[selectedLat, selectedLng]}>
          <Popup>
            <div className="font-bold">Lokasi Penghantaran Dipilih</div>
            <div>Koordinat: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}