"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Droplets, Power, PowerOff, Settings } from "lucide-react"

interface HistoryEvent {
  id: string
  timestamp: string
  valve: string
  action: "activated" | "deactivated" | "configured"
  duration?: number
  waterUsed?: number
  user: string
}

export function HistoryTable() {
  const history: HistoryEvent[] = [
    {
      id: "1",
      timestamp: "14/12/2024 18:30",
      valve: "Válvula 4",
      action: "deactivated",
      duration: 60,
      waterUsed: 180,
      user: "Sistema",
    },
    {
      id: "2",
      timestamp: "14/12/2024 18:00",
      valve: "Válvula 4",
      action: "activated",
      user: "Sistema",
    },
    {
      id: "3",
      timestamp: "14/12/2024 15:45",
      valve: "Válvula 2",
      action: "configured",
      user: "Admin",
    },
    {
      id: "4",
      timestamp: "14/12/2024 06:45",
      valve: "Válvula 2",
      action: "deactivated",
      duration: 45,
      waterUsed: 135,
      user: "Sistema",
    },
    {
      id: "5",
      timestamp: "14/12/2024 06:30",
      valve: "Válvula 1",
      action: "deactivated",
      duration: 30,
      waterUsed: 90,
      user: "Sistema",
    },
    {
      id: "6",
      timestamp: "14/12/2024 06:00",
      valve: "Válvula 2",
      action: "activated",
      user: "Sistema",
    },
    {
      id: "7",
      timestamp: "14/12/2024 06:00",
      valve: "Válvula 1",
      action: "activated",
      user: "Sistema",
    },
    {
      id: "8",
      timestamp: "13/12/2024 18:30",
      valve: "Válvula 3",
      action: "deactivated",
      duration: 30,
      waterUsed: 75,
      user: "Sistema",
    },
  ]

  const getActionIcon = (action: HistoryEvent["action"]) => {
    switch (action) {
      case "activated":
        return <Power className="w-4 h-4" />
      case "deactivated":
        return <PowerOff className="w-4 h-4" />
      case "configured":
        return <Settings className="w-4 h-4" />
    }
  }

  const getActionBadge = (action: HistoryEvent["action"]) => {
    switch (action) {
      case "activated":
        return (
          <Badge variant="default" className="gradient-primary">
            Activada
          </Badge>
        )
      case "deactivated":
        return <Badge variant="secondary">Desactivada</Badge>
      case "configured":
        return (
          <Badge variant="outline" className="border-accent text-accent">
            Configurada
          </Badge>
        )
    }
  }

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Historial de Actividad</CardTitle>
        <CardDescription>Registro completo de eventos del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-foreground">Fecha y Hora</TableHead>
                <TableHead className="text-foreground">Válvula</TableHead>
                <TableHead className="text-foreground">Acción</TableHead>
                <TableHead className="text-foreground">Duración</TableHead>
                <TableHead className="text-foreground">Agua Usada</TableHead>
                <TableHead className="text-foreground">Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((event) => (
                <TableRow key={event.id} className="hover:bg-secondary/30">
                  <TableCell className="font-medium text-foreground">{event.timestamp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{event.valve}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">{getActionBadge(event.action)}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.duration ? `${event.duration} min` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.waterUsed ? `${event.waterUsed} L` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
