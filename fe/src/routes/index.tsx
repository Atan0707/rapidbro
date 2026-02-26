import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, LocateFixed, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: App })

type NearestStopResponse = {
  stop_id: string
  stop_name: string
  stop_desc: string
  stop_lat: number
  stop_lon: number
  distance_km: number
  distance_meters: number
}

type UserCoords = {
  lat: number
  lon: number
}

function App() {
  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_BE_URL ?? 'http://localhost:3030',
    [],
  )
  const [coords, setCoords] = useState<UserCoords | null>(null)
  const [nearestStop, setNearestStop] = useState<NearestStopResponse | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchNearestStop = async (lat: number, lon: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    })
    const response = await fetch(
      `${apiBaseUrl}/stops/nearest?${params.toString()}`,
    )
    if (!response.ok) {
      const fallbackMessage = 'Unable to fetch nearest bus stop'
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(body?.error ?? fallbackMessage)
    }

    const data = (await response.json()) as NearestStopResponse
    setNearestStop(data)
  }

  const handleFindNearestStop = () => {
    setErrorMessage(null)
    setNearestStop(null)
    setIsLoading(true)

    if (!('geolocation' in navigator)) {
      setIsLoading(false)
      setErrorMessage('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setCoords({ lat, lon })

        try {
          await fetchNearestStop(lat, lon)
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to fetch nearest bus stop',
          )
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        setIsLoading(false)
        setErrorMessage(error.message || 'Unable to read your location.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nearest Bus Stop Finder</CardTitle>
          <CardDescription>
            Get your current coordinates from the browser, then fetch the
            closest GTFS stop from the backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={handleFindNearestStop}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <LocateFixed />
                Find nearest stop
              </>
            )}
          </Button>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Error
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {coords ? (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">Your location</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Latitude: {coords.lat.toFixed(6)} | Longitude:{' '}
                {coords.lon.toFixed(6)}
              </p>
            </div>
          ) : null}

          {nearestStop ? (
            <div className="rounded-md border p-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Nearest stop
              </p>
              <p className="mt-2 text-lg font-semibold">
                {nearestStop.stop_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Stop ID: {nearestStop.stop_id}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {nearestStop.stop_desc || 'No stop description'}
              </p>
              <p className="mt-2 text-sm">
                Distance: {nearestStop.distance_meters.toFixed(1)} m (
                {nearestStop.distance_km.toFixed(3)} km)
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Tap{' '}
              <span className="font-medium text-foreground">
                Find nearest stop
              </span>{' '}
              to begin.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
