type RouteLineStop = {
  stop_id: string
  stop_name: string
  sequence: number
}

type BusRouteLineProps = {
  routeShortName?: string
  routeLongName?: string
  stops: RouteLineStop[]
  currentStopId: string | null
  currentSequence?: number | null
  targetStopId?: string | null
  targetLabel?: string
  currentLabel?: string
}

function BusRouteLine({
  routeShortName,
  routeLongName,
  stops,
  currentStopId,
  currentSequence,
  targetStopId = null,
  targetLabel = 'Target stop',
  currentLabel = 'Bus is here now',
}: BusRouteLineProps) {
  const resolvedCurrentSequence =
    currentSequence ??
    stops.find((stop) => stop.stop_id === currentStopId)?.sequence ??
    null
  const targetSequence =
    stops.find((stop) => stop.stop_id === targetStopId)?.sequence ?? null

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      {routeShortName || routeLongName ? (
        <div className="mb-4 rounded-md border bg-background p-3">
          {routeShortName ? (
            <p className="text-sm font-medium">{routeShortName}</p>
          ) : null}
          {routeLongName ? (
            <p className="text-sm text-muted-foreground">{routeLongName}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-0">
        {stops.map((stop, index) => {
          const isCurrentStop = currentStopId === stop.stop_id
          const isTargetStop = targetStopId === stop.stop_id
          const isPassed =
            resolvedCurrentSequence !== null &&
            stop.sequence < resolvedCurrentSequence
          const isBetweenCurrentAndTarget =
            resolvedCurrentSequence !== null &&
            targetSequence !== null &&
            stop.sequence > resolvedCurrentSequence &&
            stop.sequence < targetSequence
          const isUpcoming =
            !isBetweenCurrentAndTarget &&
            !isTargetStop &&
            resolvedCurrentSequence !== null &&
            stop.sequence > resolvedCurrentSequence

          return (
            <div
              key={stop.stop_id}
              className="grid grid-cols-[1.5rem_1fr] gap-3"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full border-2 ${
                    isCurrentStop
                      ? 'border-foreground bg-foreground'
                      : isTargetStop
                        ? 'border-primary bg-background'
                        : isPassed
                          ? 'border-muted-foreground bg-muted-foreground'
                          : isBetweenCurrentAndTarget
                            ? 'border-primary bg-primary'
                            : isUpcoming
                              ? 'border-border bg-accent'
                              : 'border-border bg-background'
                  }`}
                />
                {index < stops.length - 1 ? (
                  <div
                    className={`min-h-8 w-px flex-1 ${
                      isPassed ? 'bg-muted-foreground' : 'bg-border'
                    }`}
                  />
                ) : null}
              </div>

              <div
                className={`pb-5 ${
                  isCurrentStop || isTargetStop
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <p className="text-sm font-medium">{stop.stop_name}</p>
                <p className="text-xs">Stop ID: {stop.stop_id}</p>
                {isCurrentStop ? (
                  <p className="mt-1 text-xs font-medium">{currentLabel}</p>
                ) : null}
                {isTargetStop ? (
                  <p className="mt-1 text-xs font-medium">{targetLabel}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { BusRouteLine }
