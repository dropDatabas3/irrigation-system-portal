"use client"

import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from "react"

type TimeRange = '7' | '30' | '90' | 'custom'

interface MetricsFilterContextType {
  selectedValves: number[] // Multiple selection
  setSelectedValves: Dispatch<SetStateAction<number[]>>
  timeRange: TimeRange
  setTimeRange: Dispatch<SetStateAction<TimeRange>>
  customStart: string
  setCustomStart: Dispatch<SetStateAction<string>>
  customEnd: string
  setCustomEnd: Dispatch<SetStateAction<string>>
  availableValves: number[]
  setAvailableValves: Dispatch<SetStateAction<number[]>>
}

const MetricsFilterContext = createContext<MetricsFilterContextType | undefined>(undefined)

export function MetricsFilterProvider({ children }: { children: ReactNode }) {
  const [selectedValves, setSelectedValves] = useState<number[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [availableValves, setAvailableValves] = useState<number[]>([])

  return (
    <MetricsFilterContext.Provider
      value={{
        selectedValves,
        setSelectedValves,
        timeRange,
        setTimeRange,
        customStart,
        setCustomStart,
        customEnd,
        setCustomEnd,
        availableValves,
        setAvailableValves,
      }}
    >
      {children}
    </MetricsFilterContext.Provider>
  )
}

export function useMetricsFilter() {
  const context = useContext(MetricsFilterContext)
  if (!context) {
    throw new Error('useMetricsFilter must be used within MetricsFilterProvider')
  }
  return context
}
