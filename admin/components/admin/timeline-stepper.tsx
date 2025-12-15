"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  label: string
  status: "completed" | "current" | "upcoming"
  timestamp?: string
}

interface TimelineStepperProps {
  steps: Step[]
}

export function TimelineStepper({ steps }: TimelineStepperProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2",
                step.status === "completed" && "border-primary bg-primary text-primary-foreground",
                step.status === "current" && "border-primary bg-background text-primary",
                step.status === "upcoming" && "border-muted-foreground/30 bg-background text-muted-foreground",
              )}
            >
              {step.status === "completed" ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn("h-12 w-0.5", step.status === "completed" ? "bg-primary" : "bg-muted-foreground/30")}
              />
            )}
          </div>
          <div className="flex-1 pb-8">
            <div
              className={cn(
                "font-medium",
                step.status === "completed" && "text-foreground",
                step.status === "current" && "text-primary",
                step.status === "upcoming" && "text-muted-foreground",
              )}
            >
              {step.label}
            </div>
            {step.timestamp && <div className="text-xs text-muted-foreground mt-1">{step.timestamp}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
