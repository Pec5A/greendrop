"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { subscribeToActivityLogsForEntity, ActivityLog } from "@/lib/firebase/services/activity-logs";
import { Clock, User, Tag, FileText, Loader2 } from "lucide-react";

interface ActivityLogPanelProps {
  entityId: string;
  entityType: "order" | "product" | "shop" | "driver" | "user";
  maxHeight?: string;
}

const actionLabels: Record<string, string> = {
  user_created: "User Created",
  user_updated: "User Updated",
  user_deleted: "User Deleted",
  order_created: "Order Created",
  order_updated: "Order Updated",
  order_cancelled: "Order Cancelled",
  order_driver_assigned: "Driver Assigned",
  verification_approved: "Verification Approved",
  verification_rejected: "Verification Rejected",
  dispute_created: "Dispute Created",
  dispute_resolved: "Dispute Resolved",
  dispute_closed: "Dispute Closed",
  zone_created: "Zone Created",
  zone_updated: "Zone Updated",
  zone_deleted: "Zone Deleted",
  config_updated: "Config Updated",
  product_created: "Product Created",
  product_updated: "Product Updated",
  merchant_created: "Merchant Created",
  merchant_updated: "Merchant Updated",
  driver_status_changed: "Driver Status Changed",
  login: "Login",
  logout: "Logout",
};

const actionColors: Record<string, string> = {
  user_created: "bg-green-500/10 text-green-600 border-green-500/20",
  product_created: "bg-green-500/10 text-green-600 border-green-500/20",
  merchant_created: "bg-green-500/10 text-green-600 border-green-500/20",
  order_created: "bg-green-500/10 text-green-600 border-green-500/20",
  zone_created: "bg-green-500/10 text-green-600 border-green-500/20",
  dispute_created: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  
  user_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  product_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  merchant_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  order_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  zone_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  config_updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  driver_status_changed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  
  user_deleted: "bg-red-500/10 text-red-600 border-red-500/20",
  zone_deleted: "bg-red-500/10 text-red-600 border-red-500/20",
  order_cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  
  order_driver_assigned: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  verification_approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  verification_rejected: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  dispute_resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  dispute_closed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  
  login: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  logout: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function ActivityLogPanel({ entityId, entityType, maxHeight = "400px" }: ActivityLogPanelProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToActivityLogsForEntity(
      entityType,
      entityId,
      (newLogs) => {
        setLogs(newLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Activity logs subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [entityId, entityType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="rounded-full bg-muted p-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={actionColors[log.type] || "bg-muted"}>
                        {actionLabels[log.type] || log.type}
                      </Badge>
                      {log.userName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{log.userName}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm">{log.message}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            {index < logs.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
