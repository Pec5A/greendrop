"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save } from "lucide-react"

const featureFlags = [
  {
    id: "new-checkout",
    name: "New Checkout Flow",
    description: "Enable the redesigned checkout experience with one-click payments",
    enabled: true,
  },
  {
    id: "driver-ratings",
    name: "Driver Ratings",
    description: "Allow customers to rate drivers after delivery",
    enabled: true,
  },
  {
    id: "live-tracking",
    name: "Live Order Tracking",
    description: "Enable real-time GPS tracking for deliveries",
    enabled: false,
  },
  {
    id: "promo-codes",
    name: "Promotional Codes",
    description: "Enable discount and promotional code functionality",
    enabled: true,
  },
  {
    id: "subscription",
    name: "Subscription Service",
    description: "Beta feature for recurring delivery subscriptions",
    enabled: false,
  },
]

const defaultJsonConfig = JSON.stringify(
  {
    platformSettings: {
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
      maxOrdersPerDay: 50,
    },
    deliverySettings: {
      minOrderValue: 10.0,
      deliveryFee: 4.99,
      freeDeliveryThreshold: 25.0,
      maxDeliveryRadius: 10,
    },
    paymentSettings: {
      acceptedMethods: ["card", "apple_pay", "google_pay"],
      currency: "USD",
      taxRate: 0.08,
    },
  },
  null,
  2
)

export default function ConfigPage() {
  const [flags, setFlags] = useState(featureFlags)
  const [jsonConfig, setJsonConfig] = useState(defaultJsonConfig)

  const toggleFlag = (id: string) => {
    setFlags((prev) => prev.map((flag) => (flag.id === id ? { ...flag, enabled: !flag.enabled } : flag)))
  }

  const handleSaveFeatures = () => {
    // Save feature flags to Firestore
  }

  const handleSaveJson = () => {
    try {
      JSON.parse(jsonConfig)
      // Save JSON configuration to Firestore
    } catch (error) {
      console.error("[v0] Invalid JSON:", error)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage platform settings and feature flags</p>
        </div>

        <Tabs defaultValue="features">
          <TabsList>
            <TabsTrigger value="features">Feature Flags</TabsTrigger>
            <TabsTrigger value="json">JSON Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Enable or disable platform features in real-time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {flags.map((flag) => (
                  <div key={flag.id} className="flex items-start justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={flag.id} className="text-sm font-medium leading-none cursor-pointer">
                        {flag.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch id={flag.id} checked={flag.enabled} onCheckedChange={() => toggleFlag(flag.id)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveFeatures}>
                <Save className="mr-2 h-4 w-4" />
                Save Feature Flags
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>JSON Configuration</CardTitle>
                <CardDescription>Advanced platform settings in JSON format</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={jsonConfig}
                  onChange={(e) => setJsonConfig(e.target.value)}
                  className="font-mono text-sm min-h-[500px]"
                  placeholder="Enter JSON configuration..."
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  Format your JSON properly. Invalid JSON will not be saved.
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveJson}>
                <Save className="mr-2 h-4 w-4" />
                Save JSON Configuration
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
