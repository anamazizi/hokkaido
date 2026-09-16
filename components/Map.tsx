'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
})

interface MapProps {
  storeLat: number
  storeLng: number
  selectedLat: number | null
  selectedLng: number | null
  onMapClick: (lat: number, lng: number) => void
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function Map({ storeLat, storeLng, selectedLat, selectedLng, onMapClick }: MapProps) {
  useEffect(() => {
    // Ensure Leaflet CSS is loaded
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

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