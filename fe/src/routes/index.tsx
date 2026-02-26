import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, LocateFixed, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'

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
  const [nearestStop, setNearestStop] = useState<NearestStopResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchNearestStop = async (lat: number, lon: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    })
    const response = await fetch(`${apiBaseUrl}/stops/nearest?${params.toString()}`)
    if (!response.ok) {
      const fallbackMessage = 'Unable to fetch nearest bus stop'
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
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
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-3">Nearest Bus Stop Finder</h1>
          <p className="text-slate-300 mb-6">
            Get your current coordinates from the browser, then ask the backend
            for the closest GTFS bus stop.
          </p>

          <button
            type="button"
            onClick={handleFindNearestStop}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5" />
            )}
            {isLoading ? 'Finding...' : 'Find nearest stop'}
          </button>

          {errorMessage && (
            <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-100">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle className="h-4 w-4" />
                Error
              </div>
              <p>{errorMessage}</p>
            </div>
          )}

          {coords && (
            <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/70 p-4">
              <h2 className="font-semibold text-cyan-300 mb-2">Your location</h2>
              <p className="text-sm text-slate-300">
                Latitude: {coords.lat.toFixed(6)} | Longitude:{' '}
                {coords.lon.toFixed(6)}
              </p>
            </div>
          )}

          {nearestStop && (
            <div className="mt-6 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-cyan-300 mb-2">
                <MapPin className="h-5 w-5" />
                Nearest stop
              </h2>
              <p className="text-lg font-bold">{nearestStop.stop_name}</p>
              <p className="text-sm text-slate-300 mb-2">
                Stop ID: {nearestStop.stop_id}
              </p>
              <p className="text-sm text-slate-300 mb-2">
                {nearestStop.stop_desc || 'No stop description'}
              </p>
              <p className="text-sm text-slate-200">
                Distance: {nearestStop.distance_meters.toFixed(1)} m (
                {nearestStop.distance_km.toFixed(3)} km)
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
