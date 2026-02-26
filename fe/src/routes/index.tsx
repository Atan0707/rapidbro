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

type BusPosition = {
  bus_no: string
  route: string
  latitude: number
  longitude: number
  speed: number
}

type GetAllMeta = {
  source: string
  last_ingest_at_unix_ms: number | null
  is_stale: boolean
  active_bus_count: number
}

type GetAllResponse = {
  data: BusPosition[]
  meta: GetAllMeta
}

type BusEta = {
  route_id: string
  bus_no: string
  current_lat: number
  current_lon: number
  current_stop_id: string
  current_sequence: number
  stops_away: number
  distance_km: number
  speed_kmh: number
  eta_minutes: number
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
  const [nearestStopEta, setNearestStopEta] = useState<BusEta[]>([])
  const [busSnapshot, setBusSnapshot] = useState<GetAllResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEta, setIsLoadingEta] = useState(false)
  const [isLoadingBuses, setIsLoadingBuses] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [etaErrorMessage, setEtaErrorMessage] = useState<string | null>(null)
  const [busErrorMessage, setBusErrorMessage] = useState<string | null>(null)

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
    return data
  }

  const fetchEtaToStop = async (stopId: string) => {
    setEtaErrorMessage(null)
    setNearestStopEta([])
    setIsLoadingEta(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/stops/${encodeURIComponent(stopId)}/eta`,
      )
      if (!response.ok) {
        const fallbackMessage = 'Unable to fetch ETA for nearest stop'
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? fallbackMessage)
      }

      const data = (await response.json()) as BusEta[]
      setNearestStopEta(data)
    } catch (error) {
      setEtaErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to fetch ETA for nearest stop',
      )
    } finally {
      setIsLoadingEta(false)
    }
  }

  const handleFindNearestStop = () => {
    setErrorMessage(null)
    setEtaErrorMessage(null)
    setNearestStop(null)
    setNearestStopEta([])
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
          const nearestStopData = await fetchNearestStop(lat, lon)
          await fetchEtaToStop(nearestStopData.stop_id)
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

  const fetchAllBuses = async () => {
    setBusErrorMessage(null)
    setIsLoadingBuses(true)

    try {
      const response = await fetch(`${apiBaseUrl}/get-all`)
      if (!response.ok) {
        const fallbackMessage = 'Unable to fetch live buses'
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? fallbackMessage)
      }

      const data = (await response.json()) as GetAllResponse
      setBusSnapshot(data)
    } catch (error) {
      setBusErrorMessage(
        error instanceof Error ? error.message : 'Unable to fetch live buses',
      )
    } finally {
      setIsLoadingBuses(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <Card className="mb-6">
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

              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-medium">
                  ETA to this stop (all routes)
                </p>
                {isLoadingEta ? (
                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading ETA...
                  </p>
                ) : null}

                {etaErrorMessage ? (
                  <p className="mt-2 text-sm text-destructive">
                    {etaErrorMessage}
                  </p>
                ) : null}

                {!isLoadingEta &&
                !etaErrorMessage &&
                nearestStopEta.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No active buses heading to this stop right now.
                  </p>
                ) : null}

                {!isLoadingEta && nearestStopEta.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {nearestStopEta.slice(0, 5).map((eta) => (
                      <div
                        key={`${eta.bus_no}-${eta.current_stop_id}`}
                        className="rounded border bg-background p-2 text-sm"
                      >
                        <p className="font-medium">Bus {eta.bus_no}</p>
                        <p className="text-muted-foreground">
                          Route {eta.route_id} · ETA{' '}
                          {eta.eta_minutes.toFixed(1)} min · {eta.stops_away}{' '}
                          stops away · {eta.distance_km.toFixed(2)} km
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Live Bus Snapshot</CardTitle>
          <CardDescription>
            Reads `/get-all` from backend Redis cache.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={fetchAllBuses}
            disabled={isLoadingBuses}
          >
            {isLoadingBuses ? (
              <>
                <LoaderCircle className="animate-spin" />
                Loading buses...
              </>
            ) : (
              'Refresh buses'
            )}
          </Button>

          {busErrorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Error
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {busErrorMessage}
              </p>
            </div>
          ) : null}

          {busSnapshot ? (
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">
                Active buses: {busSnapshot.meta.active_bus_count}
              </p>
              <p className="text-sm text-muted-foreground">
                Source: {busSnapshot.meta.source}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {busSnapshot.meta.is_stale ? 'Stale' : 'Fresh'}
              </p>
              <p className="text-sm text-muted-foreground">
                Last ingest:{' '}
                {busSnapshot.meta.last_ingest_at_unix_ms
                  ? new Date(
                      busSnapshot.meta.last_ingest_at_unix_ms,
                    ).toLocaleString()
                  : 'N/A'}
              </p>

              <div className="mt-3 space-y-2">
                {busSnapshot.data.slice(0, 8).map((bus) => (
                  <div
                    key={`${bus.bus_no}-${bus.route}`}
                    className="rounded border bg-muted/30 p-2 text-sm"
                  >
                    <p className="font-medium">
                      {bus.bus_no} · Route {bus.route}
                    </p>
                    <p className="text-muted-foreground">
                      {bus.latitude.toFixed(5)}, {bus.longitude.toFixed(5)} ·{' '}
                      {bus.speed.toFixed(1)} km/h
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Tap{' '}
              <span className="font-medium text-foreground">Refresh buses</span>{' '}
              to load Redis-backed bus data.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
