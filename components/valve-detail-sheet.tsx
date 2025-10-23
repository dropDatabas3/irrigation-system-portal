"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Calendar,
  Clock,
  Droplets,
  TrendingUp,
  Waves,
  Activity,
  Settings,
  Save,
  TestTube,
  Plus,
  X,
} from "lucide-react"
import type { Valve } from "@/components/valve-grid"

interface ValveDetailSheetProps {
  valve: Valve
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (valve: Valve) => void
}

export function ValveDetailSheet({ valve, open, onOpenChange, onUpdate }: ValveDetailSheetProps) {
  const [editedValve, setEditedValve] = useState(valve)
  const [isTesting, setIsTesting] = useState(false)

  const [scheduleMode, setScheduleMode] = useState<"daily" | "weekly" | "interval" | "custom">("daily")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // 0=Domingo, 1=Lunes, etc.
  const [intervalDays, setIntervalDays] = useState(2)
  const [intervalHours, setIntervalHours] = useState(0)
  const [scheduleTime, setScheduleTime] = useState("08:00")
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00", "18:00"])

  const [metricsDateRange, setMetricsDateRange] = useState<"week" | "month" | "year" | "custom">("week")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const handleSave = () => {
    console.log("[v0] Save button clicked, updating valve:", editedValve)
    onUpdate(editedValve)
    onOpenChange(false)
  }

  const handleTest = () => {
    console.log("[v0] Test button clicked for valve:", valve.id)
    setIsTesting(true)
    setTimeout(() => {
      console.log("[v0] Test completed for valve:", valve.id)
      setIsTesting(false)
    }, 3000)
  }

  const getStatusColor = (status: Valve["status"]) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground"
      case "inactive":
        return "bg-yellow-500 text-yellow-50"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: Valve["status"]) => {
    switch (status) {
      case "active":
        return "Activa"
      case "inactive":
        return "Inactiva"
      default:
        return "Desactivada"
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  const addScheduleTime = () => {
    if (scheduleTimes.length < 6) {
      setScheduleTimes([...scheduleTimes, "12:00"])
    }
  }

  const removeScheduleTime = (index: number) => {
    setScheduleTimes(scheduleTimes.filter((_, i) => i !== index))
  }

  const updateScheduleTime = (index: number, value: string) => {
    const newTimes = [...scheduleTimes]
    newTimes[index] = value
    setScheduleTimes(newTimes)
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-5">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">{valve.name}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{valve.zone}</p>
            </div>
            <Badge className={getStatusColor(valve.status)}>{getStatusText(valve.status)}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="metrics" className="relative z-10">
          <TabsList className="grid w-full grid-cols-2 relative z-10">
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-6">
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Filtros de Métricas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Rango de Tiempo</Label>
                  <Select value={metricsDateRange} onValueChange={(value: any) => setMetricsDateRange(value)}>
                    <SelectTrigger className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="week">Última Semana</SelectItem>
                      <SelectItem value="month">Último Mes</SelectItem>
                      <SelectItem value="year">Último Año</SelectItem>
                      <SelectItem value="custom">Rango Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {metricsDateRange === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Fecha Inicio</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">Fecha Fin</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Estado Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Caudal Actual</p>
                  <p className="text-2xl font-bold text-foreground">{valve.flowRate.toFixed(1)} L/min</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Última Activación</p>
                  <p className="text-lg font-semibold text-foreground">{valve.lastActive}</p>
                </div>
              </CardContent>
            </Card>

            {/* Water Usage Statistics */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  Consumo de Agua
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Total Usado</p>
                    <p className="text-xl font-bold text-foreground">{valve.totalWaterUsed} L</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Por Riego</p>
                    <p className="text-xl font-bold text-foreground">
                      {valve.waterAmount} {valve.waterUnit}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">Último Riego</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {valve.waterAmount} {valve.waterUnit}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Realizado: {valve.lastActive}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Promedio por día</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{valve.averagePerDay} L</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Promedio por semana</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{valve.averagePerWeek} L</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Promedio por mes</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{valve.averagePerMonth} L</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Promedio por riego</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{valve.averagePerIrrigation} L</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Information */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Horarios Programados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {valve.scheduledTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valve.scheduledTimes.map((time, index) => (
                      <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                        {time}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay horarios programados</p>
                )}
              </CardContent>
            </Card>

            {/* Flow Rate History */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Caudal Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Caudal promedio histórico</span>
                    <span className="text-lg font-semibold text-foreground">
                      {(valve.flowRate * 0.85).toFixed(1)} L/min
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4 mt-6">
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg">Configuración General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label htmlFor="valve-name">Nombre de la Válvula</Label>
                  <Input
                    id="valve-name"
                    value={editedValve.name}
                    onChange={(e) => setEditedValve({ ...editedValve, name: e.target.value })}
                    className="relative z-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valve-zone">Zona</Label>
                  <Input
                    id="valve-zone"
                    value={editedValve.zone}
                    onChange={(e) => setEditedValve({ ...editedValve, zone: e.target.value })}
                    className="relative z-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valve-status">Estado</Label>
                  <Select
                    value={editedValve.status}
                    onValueChange={(value: "active" | "inactive" | "off") =>
                      setEditedValve({ ...editedValve, status: value })
                    }
                  >
                    <SelectTrigger id="valve-status" className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                      <SelectItem value="off">Desactivada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Water Amount Configuration */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyan-500" />
                  Cantidad de Agua por Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select
                    value={editedValve.waterUnit}
                    onValueChange={(value: "L" | "ml") => setEditedValve({ ...editedValve, waterUnit: value })}
                  >
                    <SelectTrigger className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="L">Litros (L)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>
                      Cantidad: {editedValve.waterAmount} {editedValve.waterUnit}
                    </Label>
                  </div>
                  <Slider
                    value={[editedValve.waterAmount]}
                    onValueChange={([value]) => setEditedValve({ ...editedValve, waterAmount: value })}
                    min={editedValve.waterUnit === "L" ? 1 : 100}
                    max={editedValve.waterUnit === "L" ? 200 : 5000}
                    step={editedValve.waterUnit === "L" ? 1 : 50}
                    className="w-full relative z-10"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{editedValve.waterUnit === "L" ? "1 L" : "100 ml"}</span>
                    <span>{editedValve.waterUnit === "L" ? "200 L" : "5000 ml"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Programación de Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                {/* Schedule Mode Selection */}
                <div className="space-y-2">
                  <Label>Modo de Programación</Label>
                  <Select value={scheduleMode} onValueChange={(value: any) => setScheduleMode(value)}>
                    <SelectTrigger className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal (Días Específicos)</SelectItem>
                      <SelectItem value="interval">Por Intervalo</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Daily Mode */}
                {scheduleMode === "daily" && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Riego todos los días a las horas especificadas</p>
                    <div className="space-y-3">
                      {scheduleTimes.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateScheduleTime(index, e.target.value)}
                            className="relative z-10"
                          />
                          {scheduleTimes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeScheduleTime(index)}
                              className="relative z-10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {scheduleTimes.length < 6 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addScheduleTime}
                          className="w-full relative z-10 bg-transparent"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Horario
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Weekly Mode */}
                {scheduleMode === "weekly" && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Selecciona los días de la semana</p>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={selectedDays.includes(index) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(index)}
                          className="relative z-10 p-2 h-auto"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="weekly-time">Hora de Riego</Label>
                      <Input
                        id="weekly-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                  </div>
                )}

                {/* Interval Mode */}
                {scheduleMode === "interval" && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Riego cada cierto intervalo de tiempo</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="interval-days">Días</Label>
                        <Input
                          id="interval-days"
                          type="number"
                          min="0"
                          max="30"
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(Number(e.target.value))}
                          className="relative z-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interval-hours">Horas</Label>
                        <Input
                          id="interval-hours"
                          type="number"
                          min="0"
                          max="23"
                          value={intervalHours}
                          onChange={(e) => setIntervalHours(Number(e.target.value))}
                          className="relative z-10"
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-foreground">
                        Frecuencia: Cada {intervalDays > 0 && `${intervalDays} día${intervalDays > 1 ? "s" : ""}`}
                        {intervalDays > 0 && intervalHours > 0 && " y "}
                        {intervalHours > 0 && `${intervalHours} hora${intervalHours > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interval-start-time">Hora de Inicio</Label>
                      <Input
                        id="interval-start-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Mode */}
                {scheduleMode === "custom" && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">
                      Configuración avanzada: combina días específicos con múltiples horarios
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block">Días de la Semana</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {dayNames.map((day, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={selectedDays.includes(index) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDay(index)}
                              className="relative z-10 p-2 h-auto"
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="mb-2 block">Horarios</Label>
                        <div className="space-y-3">
                          {scheduleTimes.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={time}
                                onChange={(e) => updateScheduleTime(index, e.target.value)}
                                className="relative z-10"
                              />
                              {scheduleTimes.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeScheduleTime(index)}
                                  className="relative z-10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {scheduleTimes.length < 6 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addScheduleTime}
                              className="w-full relative z-10 bg-transparent"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Horario
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Button */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-primary" />
                  Prueba de Válvula
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || editedValve.status === "off"}
                  className="w-full bg-transparent relative z-10"
                  variant="outline"
                >
                  {isTesting ? "Probando..." : "Probar Válvula"}
                </Button>
                {isTesting && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    La válvula se activará por 3 segundos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button type="button" onClick={handleSave} className="w-full gradient-primary relative z-10" size="lg">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
