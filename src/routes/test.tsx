import { createFileRoute } from '@tanstack/react-router'
import GtfsRealtime from 'gtfs-realtime-bindings'
import { useEffect } from 'react'

export const Route = createFileRoute('/test')({
  component: RouteComponent,
})

function RouteComponent() {
    const endpoint = 'https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl'

    const getData = async () => {
        try {
            const response = await fetch(endpoint)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const buffer = await response.arrayBuffer()
            const feed = GtfsRealtime.transit_realtime.FeedMessage.decode(
                new Uint8Array(buffer)
            )
            const vehiclePositions = []
            feed.entity.forEach((entity) => {
                if (entity.vehicle) {
                    vehiclePositions.push(entity.vehicle)
                }
            })
            console.log(`Total vehicles: ${vehiclePositions.length}`)
            console.log(vehiclePositions)
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

    useEffect(() => {
        getData()
    }, [])
   
    return <div>Hello "/test"!</div>
}
