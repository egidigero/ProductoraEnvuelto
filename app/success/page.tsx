"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Mail, Home, Loader2, Download, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Ticket {
  id: string
  attendee_name: string
  attendee_dni: string
  qr_code_url: string
  ticket_type_name: string
  status: string
}

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const order_id = searchParams.get("order_id")
  const order_reference = searchParams.get("order_reference")
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [orderInfo, setOrderInfo] = useState<any>(null)

  useEffect(() => {
    if (order_id) {
      fetchTickets()
    } else {
      setLoading(false)
    }
  }, [order_id])

  const fetchTickets = async () => {
    try {
      const response = await fetch(`/api/orders/${order_id}/tickets`)
      const data = await response.json()
      
      if (response.ok) {
        setTickets(data.tickets || [])
        setOrderInfo(data.order)
      }
    } catch (error) {
      console.error("Error cargando tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = (qrCodeUrl: string, attendeeName: string) => {
    const link = document.createElement("a")
    link.href = qrCodeUrl
    link.download = `ticket-${attendeeName.replace(/\s+/g, "-")}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-600">
              ¡Compra exitosa!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg">
                Tu orden ha sido procesada correctamente
              </p>
              {order_reference && (
                <p className="text-sm text-muted-foreground">
                  Referencia: <span className="font-mono">{order_reference}</span>
                </p>
              )}
              {orderInfo && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  <Badge variant="secondary">
                    {tickets.length} {tickets.length === 1 ? "Ticket" : "Tickets"}
                  </Badge>
                  <span className="font-semibold">
                    Total: ${orderInfo.amount?.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-6 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Revisa tu email
                  </h3>
                  <p className="text-sm text-blue-700">
                    Te enviamos tus entradas con códigos QR adjuntos a <strong>{orderInfo?.buyer_email}</strong>.
                    Si no lo ves, revisa tu carpeta de spam.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {tickets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Tus Códigos QR</h2>
            <p className="text-center text-muted-foreground">
              Descarga o captura cada código QR para presentar en el evento
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {tickets.map((ticket, index) => (
                <Card key={ticket.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-lg">
                          {ticket.attendee_name}
                        </CardTitle>
                      </div>
                      <Badge variant="outline">{ticket.ticket_type_name}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      DNI: {ticket.attendee_dni}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                      {ticket.qr_code_url ? (
                        <img 
                          src={ticket.qr_code_url} 
                          alt={`QR Code para ${ticket.attendee_name}`}
                          className="w-48 h-48 object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                          QR no disponible
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => downloadQR(ticket.qr_code_url, ticket.attendee_name)}
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar QR
                    </Button>

                    <div className="text-xs text-center text-muted-foreground">
                      Ticket #{index + 1} - {ticket.status === "valid" ? "✓ Válido" : ticket.status}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="bg-violet-50 p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-violet-900">
                ¿Qué sigue?
              </h3>
              <ul className="space-y-2 text-sm text-violet-700">
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  Descarga todos tus códigos QR (botón en cada ticket)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  Presenta tu QR en la entrada del evento
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  Cada QR es único e intransferible
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  Guarda este email/screenshot hasta el día del evento
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button asChild className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Si tienes algún problema, contáctanos respondiendo el email que te enviamos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
