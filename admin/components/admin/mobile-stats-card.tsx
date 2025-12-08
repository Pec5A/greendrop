"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, Users, MapPin, Zap } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function MobileStatsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile App Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Active Users (24h)</span>
            </div>
            <span className="font-semibold">1,234</span>
          </div>
          <Progress value={82} className="h-2" />
          <p className="text-xs text-muted-foreground">82% of total user base</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Drivers Online</span>
            </div>
            <span className="font-semibold">87</span>
          </div>
          <Progress value={65} className="h-2" />
          <p className="text-xs text-muted-foreground">65% of verified drivers</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>App Performance</span>
            </div>
            <span className="font-semibold">98.5%</span>
          </div>
          <Progress value={98.5} className="h-2" />
          <p className="text-xs text-muted-foreground">Uptime last 7 days</p>
        </div>

        <div className="pt-4 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">iOS Users</span>
            <span className="font-medium">58%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Android Users</span>
            <span className="font-medium">42%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
