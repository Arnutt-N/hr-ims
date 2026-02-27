---
name: geolocation-helper
description: Geolocation and location services for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["geolocation", "location", "gps", "map", "coordinates", "distance"]
  file_patterns: ["*geolocation*", "*location*", "hooks/use-location*"]
  context: location tracking, GPS coordinates, maps, distance calculation
mcp_servers:
  - sequential
personas:
  - frontend
---

# Geolocation Helper

## Core Role

Handle location services for HR-IMS:
- GPS coordinate capture
- Distance calculation
- Map integration
- Location tracking

---

## Location Hook

```typescript
// hooks/use-geolocation.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  altitude: number | null
  heading: number | null
  speed: number | null
  timestamp: Date | null
  error: GeolocationPositionError | null
  loading: boolean
}

interface GeolocationPositionError {
  code: number
  message: string
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0
  } = options

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    timestamp: null,
    error: null,
    loading: true
  })

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: new Date(position.timestamp),
      error: null,
      loading: false
    })
  }, [])

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }))
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      handleError({
        code: 0,
        message: 'Geolocation is not supported by this browser.'
      })
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enableHighAccuracy, timeout, maximumAge, updatePosition, handleError])

  const getCurrentPosition = useCallback((): Promise<GeolocationState> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          ...state,
          error: { code: 0, message: 'Geolocation not supported' }
        })
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            timestamp: new Date(position.timestamp),
            error: null,
            loading: false
          })
        },
        (error) => {
          resolve({
            ...state,
            error: { code: error.code, message: error.message }
          })
        },
        { enableHighAccuracy, timeout, maximumAge }
      )
    })
  }, [enableHighAccuracy, timeout, maximumAge, state])

  return {
    ...state,
    getCurrentPosition,
    hasLocation: state.latitude !== null && state.longitude !== null
  }
}
```

---

## Distance Calculation

```typescript
// lib/location/distance.ts

export interface Coordinates {
  latitude: number
  longitude: number
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  unit: 'km' | 'miles' | 'meters' = 'km'
): number {
  const R = 6371 // Earth's radius in km

  const dLat = toRad(point2.latitude - point1.latitude)
  const dLon = toRad(point2.longitude - point1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  let distance = R * c

  switch (unit) {
    case 'miles':
      distance *= 0.621371
      break
    case 'meters':
      distance *= 1000
      break
    default:
      break
  }

  return distance
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Check if point is within radius
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(center, point, 'km')
  return distance <= radiusKm
}

// Find nearest point from array
export function findNearestPoint<T extends Coordinates>(
  from: Coordinates,
  points: T[]
): T | null {
  if (points.length === 0) return null

  let nearest = points[0]
  let minDistance = calculateDistance(from, nearest)

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(from, points[i])
    if (distance < minDistance) {
      minDistance = distance
      nearest = points[i]
    }
  }

  return nearest
}

// Sort points by distance
export function sortByDistance<T extends Coordinates>(
  from: Coordinates,
  points: T[],
  ascending: boolean = true
): T[] {
  return [...points].sort((a, b) => {
    const distA = calculateDistance(from, a)
    const distB = calculateDistance(from, b)
    return ascending ? distA - distB : distB - distA
  })
}

// Calculate bounding box
export function calculateBoundingBox(
  center: Coordinates,
  radiusKm: number
): {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
} {
  const latChange = radiusKm / 110.574 // Approximate km per degree latitude
  const lonChange = radiusKm / (111.32 * Math.cos(toRad(center.latitude)))

  return {
    minLat: center.latitude - latChange,
    maxLat: center.latitude + latChange,
    minLon: center.longitude - lonChange,
    maxLon: center.longitude + lonChange
  }
}
```

---

## Address Geocoding

```typescript
// lib/location/geocoding.ts

interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
  streetNumber?: string
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    )
    const data = await response.json()

    if (data.length === 0) return null

    const result = data[0]
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
    return null
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    )
    const data = await response.json()

    if (data.error) return null

    const address = data.address || {}
    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      formattedAddress: data.display_name,
      streetNumber: address.house_number,
      street: address.road,
      city: address.city || address.town || address.village,
      state: address.state,
      country: address.country,
      postalCode: address.postcode
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    return null
  }
}
```

---

## Location Picker Component

```typescript
// components/location/location-picker.tsx
'use client'

import { useState, useEffect } from 'react'
import { useGeolocation } from '@/hooks/use-geolocation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Locate, Loader2 } from 'lucide-react'

interface LocationPickerProps {
  value?: { latitude: number; longitude: number }
  onChange: (location: { latitude: number; longitude: number } | null) => void
  placeholder?: string
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'ค้นหาตำแหน่ง...'
}: LocationPickerProps) {
  const { latitude, longitude, loading, error, hasLocation } = useGeolocation()
  const [address, setAddress] = useState('')
  const [searching, setSearching] = useState(false)

  const handleGetCurrentLocation = async () => {
    if (hasLocation) {
      onChange({ latitude: latitude!, longitude: longitude! })
      const result = await reverseGeocode(latitude!, longitude!)
      if (result) {
        setAddress(result.formattedAddress)
      }
    }
  }

  const handleSearchAddress = async () => {
    if (!address.trim()) return

    setSearching(true)
    try {
      const result = await geocodeAddress(address)
      if (result) {
        onChange({ latitude: result.latitude, longitude: result.longitude })
        setAddress(result.formattedAddress)
      }
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (value && !address) {
      reverseGeocode(value.latitude, value.longitude).then(result => {
        if (result) setAddress(result.formattedAddress)
      })
    }
  }, [value])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleSearchAddress}
          disabled={searching || !address.trim()}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={loading || !hasLocation}
          title="ใช้ตำแหน่งปัจจุบัน / Use current location"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          ไม่สามารถเข้าถึงตำแหน่งได้ / Unable to access location
        </p>
      )}

      {value && (
        <p className="text-sm text-muted-foreground">
          📍 {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </p>
      )}
    </div>
  )
}
```

---

## Warehouse Distance Finder

```typescript
// components/location/warehouse-distance.tsx
'use client'

import { useState, useEffect } from 'react'
import { useGeolocation } from '@/hooks/use-geolocation'
import { calculateDistance, sortByDistance, Coordinates } from '@/lib/location/distance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Navigation } from 'lucide-react'

interface Warehouse extends Coordinates {
  id: number
  name: string
  code: string
  address: string
}

interface WarehouseDistanceProps {
  warehouses: Warehouse[]
  onSelect?: (warehouse: Warehouse) => void
}

export function WarehouseDistanceFinder({
  warehouses,
  onSelect
}: WarehouseDistanceProps) {
  const { latitude, longitude, hasLocation } = useGeolocation()
  const [nearestWarehouses, setNearestWarehouses] = useState<Array<{
    warehouse: Warehouse
    distance: number
  }>>([])

  useEffect(() => {
    if (!hasLocation || warehouses.length === 0) {
      setNearestWarehouses([])
      return
    }

    const currentLocation: Coordinates = {
      latitude: latitude!,
      longitude: longitude!
    }

    const sorted = sortByDistance(currentLocation, warehouses)
    const nearest = sorted.slice(0, 5).map(warehouse => ({
      warehouse,
      distance: calculateDistance(currentLocation, warehouse)
    }))

    setNearestWarehouses(nearest)
  }, [hasLocation, latitude, longitude, warehouses])

  if (!hasLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>คลังใกล้เคียง / Nearest Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            กรุณาเปิดใช้งาน GPS เพื่อดูคลังใกล้เคียง
          <br />
            Please enable GPS to see nearest warehouses
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
        <Navigation className="h-5 w-5" />
        คลังใกล้เคียง / Nearest Warehouses
      </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
        {nearestWarehouses.map(({ warehouse, distance }) => (
          <div
            key={warehouse.id}
            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
            onClick={() => onSelect?.(warehouse)}
          >
            <div>
              <p className="font-medium">{warehouse.name}</p>
              <p className="text-sm text-muted-foreground">{warehouse.address}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-primary">
                {distance.toFixed(1)} km
              </span>
              <span className="text-xs text-muted-foreground">จากคุณ</span>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
    </Card>
  )
}
```

---

## Usage Examples

```typescript
// Example 1: Get current location
function LocationDisplay() {
  const { latitude, longitude, loading, error } = useGeolocation()

  if (loading) return <p>กำลังโหลดตำแหน่ง...</p>
  if (error) return <p>ไม่สามารถเข้าถึงตำแหน่งได้</p>

  return (
    <p>
      ตำแหน่ง: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
    </p>
  )
}

// Example 2: Calculate distance
const distance = calculateDistance(
  { latitude: 13.7563, longitude: 100.5018 }, // Bangkok
  { latitude: 18.7883, longitude: 98.9853 }, // Chiang Mai
  'km'
)
// Result: ~577 km

// Example 3: Find nearest warehouse
const nearest = findNearestPoint(currentLocation, warehouses)

// Example 4: Location picker in form
<LocationPicker
  value={form.values.location}
  onChange={(loc) => form.setValue('location', loc)}
/>
```

---

*Version: 1.0.0 | For HR-IMS Project*
