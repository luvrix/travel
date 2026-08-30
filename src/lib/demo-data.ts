import type { Trip } from '../types'
import { DAY_COLORS } from './colors'

export const DEMO_TRIP: Trip = {
  id: 'demo-1',
  title: '北京City Walk',
  startDate: '2026-05-01',
  days: [
    {
      id: 'day-1',
      color: DAY_COLORS[0],
      stops: [
        { id: 's1', name: '天安门广场', startTime: '09:00', city: '北京', amapResolved: true, location: { lat: 39.9054, lng: 116.3976 } },
        { id: 's2', name: '故宫博物院', startTime: '10:00', city: '北京', amapResolved: true, location: { lat: 39.9163, lng: 116.3972 } },
        { id: 's3', name: '景山公园', startTime: '12:00', city: '北京', amapResolved: true, location: { lat: 39.9244, lng: 116.3904 }, transport: 'walk' },
        { id: 's4', name: '什刹海', startTime: '15:00', city: '北京', amapResolved: true, location: { lat: 39.9400, lng: 116.3830 }, transport: 'subway' },
        { id: 's5', name: '南锣鼓巷', startTime: '13:30', city: '北京', amapResolved: true, location: { lat: 39.9321, lng: 116.3968 }, transport: 'taxi' },
        { id: 's6', name: '鼓楼', startTime: '17:00', city: '北京', amapResolved: true, location: { lat: 39.9410, lng: 116.3920 }, transport: 'walk' },
      ],
    },
  ],
}
