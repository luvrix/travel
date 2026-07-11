import type { Trip } from '../types'
import { DAY_COLORS } from './colors'

export const DEMO_TRIP: Trip = {
  id: 'demo-1',
  title: '北京3日游',
  startDate: '2026-05-01',
  days: [
    {
      id: 'day-1',
      color: DAY_COLORS[0],
      stops: [
        { id: 's1', name: '上海', startTime: '07:00', location: { lat: 31.2304, lng: 121.4737 } },
        { id: 's2', name: '故宫博物院', startTime: '10:00', location: { lat: 39.9174, lng: 116.3908 }, transport: 'flight' },
        { id: 's3', name: '景山公园', startTime: '11:30', location: { lat: 39.9244, lng: 116.3904 }, transport: 'walk' },
        { id: 's4', name: '南锣鼓巷', startTime: '13:00', location: { lat: 39.9321, lng: 116.3968 }, transport: 'taxi' },
      ],
    },
    {
      id: 'day-2',
      color: DAY_COLORS[1],
      stops: [
        { id: 's5', name: '八达岭长城', startTime: '08:30', location: { lat: 40.3572, lng: 116.0093 }, transport: 'bus' },
        { id: 's6', name: '颐和园', startTime: '13:00', location: { lat: 39.9967, lng: 116.2758 } },
        { id: 's7', name: '圆明园遗址公园', startTime: '15:30', location: { lat: 40.0051, lng: 116.2972 } },
      ],
    },
    {
      id: 'day-3',
      color: DAY_COLORS[2],
      stops: [
        { id: 's8', name: '天坛公园', startTime: '10:00', location: { lat: 39.8799, lng: 116.4042 } },
        { id: 's9', name: '前门大街', startTime: '12:30', location: { lat: 39.8934, lng: 116.3919 } },
        { id: 's10', name: '上海', startTime: '18:00', location: { lat: 31.2304, lng: 121.4737 }, transport: 'flight' },
      ],
    },
  ],
}
