import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Clock, QrCode, Mail, MessageCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SuccessPage() {
  // In a real app, this would come from URL params or API
  const orderDetails = {
    orderId: "FX-2025-001234",
    tickets: [{ type: "VIP", quantity: 2, price: 26250 }],
    total: 52500,
    purchaseDate: "15 Feb 2025, 14:30",
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Success Hero */}
      <section className="relative py-20 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,197,94,0.1),transparent_50%)]"></div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-balance">¡Pago Confirmado!</h1>

            <p className="text-xl text-muted-foreground mb-2">Tu compra se procesó exitosamente</p>

            <div className="flex items-center justify-center gap-6 text-lg text-primary font-medium">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <span>Email</span>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mt-4">
              <strong className="text-foreground">Te enviamos tu QR por WhatsApp y email</strong>
            </p>
          </div>

          {/* Order Details Card */}
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Detalles de tu Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order ID */}
              <div className="text-center">
                <Badge variant="outline" className="text-sm font-mono px-4 py-2">
                  {orderDetails.orderId}
                </Badge>
              </div>

              {/* Event Info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg text-center">FIESTA X — Opening Night</h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Sábado 15 Marzo, 2025</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>22:00 hs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Club Nocturno Elite</span>
                  </div>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-3">
                {orderDetails.tickets.map((ticket, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border/50">
                    <div>
                      <span className="font-medium">Entrada {ticket.type}</span>
                      <span className="text-muted-foreground"> × {ticket.quantity}</span>
                    </div>
                    <div className="font-medium">${ticket.price.toLocaleString()}</div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 text-lg font-bold text-primary">
                  <span>Total Pagado:</span>
                  <span>${orderDetails.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Purchase Info */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Compra realizada el {orderDetails.purchaseDate}</p>
              </div>

              {/* Decorative Mini QR */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-foreground rounded-lg flex items-center justify-center">
                  <div className="w-12 h-12 bg-background rounded grid grid-cols-4 gap-px p-1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${Math.random() > 0.5 ? "bg-foreground" : "bg-background"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-semibold mb-2 text-primary">Información Importante</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Presenta tu QR en la entrada del evento</li>
              <li>• El QR es único e intransferible</li>
              <li>• Guarda este código hasta el día del evento</li>
              <li>• En caso de problemas, contacta al organizador</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Link>
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">Descargar Comprobante</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
