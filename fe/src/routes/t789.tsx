import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/t789')({
  component: T789Page,
})

type T789Bus = {
  bus_no: string
  route: string
  latitude: number
  longitude: number
  speed: number
  busstop_id?: string | null
}

type BusEta = {
  route_id?: string
  bus_no: string
  current_stop_id: string
  stops_away: number
  distance_km: number
  speed_kmh: number
  eta_minutes: number
}

type RouteStopsResponse = {
  stops: Array<{
    stop_id: string
    stop_name: string
  }>
}

function T789Page() {
  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_BE_URL ?? 'http://localhost:3030',
    [],
  )

  const [activeBuses, setActiveBuses] = useState<T789Bus[]>([])
  const [etas, setEtas] = useState<BusEta[]>([])
  const [stopNameById, setStopNameById] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [etaErrorMessage, setEtaErrorMessage] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const normalizeT789Buses = (payload: unknown): T789Bus[] => {
    if (Array.isArray(payload)) {
      return payload as T789Bus[]
    }

    if (payload && typeof payload === 'object' && 'bus_no' in payload) {
      return [payload as T789Bus]
    }

    return []
  }

  const fetchT789Buses = useCallback(async () => {
    setErrorMessage(null)
    setEtaErrorMessage(null)
    setIsLoading(true)

    try {
      const [busesResponse, etaResponse, stopsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/get-route-t789`),
        fetch(`${apiBaseUrl}/get-t789-eta`),
        fetch(`${apiBaseUrl}/route/T7890/stops`),
      ])

      if (!busesResponse.ok) {
        const fallbackMessage = 'Unable to fetch active T789 buses'
        const body = (await busesResponse.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? fallbackMessage)
      }

      const payload = (await busesResponse.json()) as unknown
      setActiveBuses(normalizeT789Buses(payload))

      if (etaResponse.ok) {
        const etaData = (await etaResponse.json()) as BusEta[]
        setEtas(etaData)
      } else {
        const fallbackMessage = 'Unable to fetch ETA to KL Gateway'
        const body = (await etaResponse.json().catch(() => null)) as {
          error?: string
        } | null
        setEtaErrorMessage(body?.error ?? fallbackMessage)
        setEtas([])
      }

      if (stopsResponse.ok) {
        const stopsData = (await stopsResponse.json()) as RouteStopsResponse
        const nameMap = stopsData.stops.reduce<Record<string, string>>(
          (acc, stop) => {
            acc[stop.stop_id] = stop.stop_name
            return acc
          },
          {},
        )
        setStopNameById(nameMap)
      }

      setLastUpdated(new Date())
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to fetch active T789 buses',
      )
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    fetchT789Buses()

    const id = setInterval(() => {
      fetchT789Buses()
    }, 15000)

    return () => clearInterval(id)
  }, [fetchT789Buses])

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>T789 Route</CardTitle>
          <CardDescription>Active buses for T789.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={fetchT789Buses} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw />
                  Refresh
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              {lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : 'No updates yet'}
            </p>
          </div>

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

          {etaErrorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                ETA Error
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {etaErrorMessage}
              </p>
            </div>
          ) : null}

          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              All active T789 buses ({activeBuses.length})
            </p>
            {!isLoading && !errorMessage && activeBuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active T789 buses right now.
              </p>
            ) : null}

            {activeBuses.length > 0 ? (
              <div className="space-y-2">
                {activeBuses.map((bus) => (
                  <div
                    key={`${bus.route}-${bus.bus_no}`}
                    className="rounded border p-2"
                  >
                    <p className="font-medium">
                      Bus {bus.bus_no} · Route {bus.route}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bus.latitude.toFixed(5)}, {bus.longitude.toFixed(5)} ·{' '}
                      {bus.speed.toFixed(1)} km/h
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current stop:{' '}
                      {bus.busstop_id
                        ? stopNameById[bus.busstop_id] || bus.busstop_id
                        : 'Unknown'}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">ETA to KL Gateway</p>
            {!isLoading && !etaErrorMessage && etas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ETA is available for KL Gateway right now.
              </p>
            ) : null}

            {etas.length > 0 ? (
              <div className="space-y-2">
                {etas.map((eta) => (
                  <div
                    key={`${eta.route_id || 'T7890'}-${eta.bus_no}-${eta.current_stop_id}`}
                    className="rounded border p-2"
                  >
                    <p className="font-medium">
                      Bus {eta.bus_no} · Route {eta.route_id || 'T7890'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ETA {eta.eta_minutes.toFixed(1)} min · {eta.stops_away}{' '}
                      stops away · {eta.distance_km.toFixed(2)} km
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current stop:{' '}
                      {stopNameById[eta.current_stop_id] || eta.current_stop_id}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
