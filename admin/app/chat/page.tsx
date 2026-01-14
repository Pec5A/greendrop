"use client"

import { useEffect, useRef, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useChat } from "@/hooks/use-chat"
import { useOrders } from "@/hooks/use-orders"
import { useAuth } from "@/lib/firebase/auth-context"
import { useLanguage } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquare, Send, Search, Loader2, User, ShoppingCart } from "lucide-react"

export default function ChatPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { orders, loading: ordersLoading } = useOrders()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, loading: chatLoading, sendMessage } = useChat(selectedOrderId)

  // Filter orders that have active status (potential chat candidates)
  const chatOrders = orders.filter((o) => {
    if (searchQuery) {
      const hay = `${o.id} ${o.reference || ""} ${o.driverName || ""}`.toLowerCase()
      if (!hay.includes(searchQuery.toLowerCase())) return false
    }
    return ["paid", "shipped"].includes(o.status)
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return
    const content = messageInput.trim()
    setMessageInput("")
    setSending(true)
    try {
      await sendMessage(content)
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("language") === "fr" ? "Chat en temps réel" : "Real-time Chat"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("language") === "fr"
              ? "Communiquez avec les clients et chauffeurs par commande"
              : "Communicate with clients and drivers per order"}
          </p>
        </div>

        <div className="flex h-[calc(100vh-220px)] rounded-lg border bg-background overflow-hidden">
          {/* Sidebar — order list */}
          <div className="w-80 border-r flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("language") === "fr" ? "Rechercher une commande..." : "Search order..."}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : chatOrders.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t("language") === "fr" ? "Aucune commande active" : "No active orders"}
                </div>
              ) : (
                chatOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      "w-full text-left p-3 border-b hover:bg-muted/50 transition-colors",
                      selectedOrderId === order.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            #{order.reference || order.id.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0 ml-2">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {order.driverName || (t("language") === "fr" ? "Pas de chauffeur" : "No driver")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!selectedOrderId ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {t("language") === "fr"
                      ? "Sélectionnez une commande pour ouvrir le chat"
                      : "Select an order to open chat"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t("language") === "fr" ? "Commande" : "Order"} #{selectedOrderId.slice(0, 8)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {messages.length} message{messages.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {chatLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {t("language") === "fr"
                        ? "Aucun message. Commencez la conversation !"
                        : "No messages yet. Start the conversation!"}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.uid
                        const showDate =
                          idx === 0 || formatDate(messages[idx - 1].timestamp) !== formatDate(msg.timestamp)

                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                  {formatDate(msg.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                              {!isMe && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                {!isMe && (
                                  <p className="text-xs text-muted-foreground mb-1 ml-1">
                                    {msg.senderName}{" "}
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 ml-1">
                                      {msg.senderRole}
                                    </Badge>
                                  </p>
                                )}
                                <div
                                  className={cn(
                                    "rounded-2xl px-4 py-2 text-sm",
                                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                  )}
                                >
                                  {msg.content}
                                </div>
                                <p
                                  className={cn(
                                    "text-[10px] text-muted-foreground mt-1",
                                    isMe ? "text-right mr-1" : "ml-1"
                                  )}
                                >
                                  {formatTime(msg.timestamp)}
                                  {isMe && msg.isRead && " ✓✓"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("language") === "fr" ? "Écrire un message..." : "Type a message..."}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                    />
                    <Button onClick={handleSend} disabled={!messageInput.trim() || sending} size="icon">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
