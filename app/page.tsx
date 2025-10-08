"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, MapPin, Clock, Star, CheckCircle, Plus, Minus, ShoppingCart, HelpCircle } from "lucide-react"
import Image from "next/image"

interface TicketType {
  id: string
  name: string
  description: string
  basePrice: number
  finalPrice: number
  features: string[]
  variant: "default" | "primary" | "accent"
  popular?: boolean
}

const ticketTypes: TicketType[] = [
  {
    id: "general",
    name: "General",
    description: "Acceso completo al evento",
    basePrice: 15000,
    finalPrice: 15850,
    variant: "default",
    features: ["Acceso a todas las áreas", "Acceso hasta las 2 AM", "Guardarropa incluido"],
  },
  {
    id: "vip",
    name: "VIP",
    description: "Experiencia premium exclusiva",
    basePrice: 25000,
    finalPrice: 26250,
    variant: "primary",
    popular: true,
    features: ["Acceso VIP exclusivo", "Barra premium ilimitada", "Mesa reservada", "Acceso hasta las 2 AM"],
  },
  {
    id: "early",
    name: "Early Bird",
    description: "Oferta por tiempo limitado",
    basePrice: 10000,
    finalPrice: 10850,
    variant: "accent",
    features: ["Acceso general", "Acceso hasta 1 AM", "Entrada prioritaria"],
  },
]

export default function EventLandingPage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [showPreview, setShowPreview] = useState(false)

  const updateQuantity = (ticketId: string, quantity: number) => {
    if (quantity <= 0) {
      const newCart = { ...cart }
      delete newCart[ticketId]
      setCart(newCart)
    } else {
      setCart({ ...cart, [ticketId]: quantity })
    }
  }

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  }

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [ticketId, qty]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId)
      return sum + (ticket ? ticket.finalPrice * qty : 0)
    }, 0)
  }

  const getTotalBasePrice = () => {
    return Object.entries(cart).reduce((sum, [ticketId, qty]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId)
      return sum + (ticket ? ticket.basePrice * qty : 0)
    }, 0)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background with purple lighting effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.2),transparent_50%)] opacity-40"></div>

        <div className="absolute top-8 left-8 z-20">
          <div className="flex items-center gap-3">
            <Image
              src="/images/on-repeat-logo.png"
              alt="ON REPEAT"
              width={60}
              height={60}
              className="drop-shadow-lg opacity-45"
            />
            <div className="text-left">
              <div className="text-lg font-bold text-white">ON REPEAT</div>
              <div className="text-sm text-muted-foreground">Productora</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="space-y-6">
            <Badge variant="secondary" className="text-sm font-medium px-4 py-2">
              Evento Premium
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-balance">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">FIESTA X</span>
              <br />
              <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-muted-foreground">Opening Night</span>
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-lg text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Sábado 15 Marzo, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span>22:00 hs</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>El Club De Los Pescadores</span>
              </div>
            </div>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Una experiencia nocturna única con los mejores DJs internacionales.
              <strong className="text-accent"> Ingreso exclusivo con QR único.</strong>
            </p>

            <div className="pt-4">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" })}
              >
                Comprar Entradas
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
            <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Ticket Cards Section */}
      <section id="tickets" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Elige tu Experiencia</h2>
            <p className="text-xl text-muted-foreground">Precios finales incluyen cargo de servicio</p>
            <p className="text-sm text-muted-foreground mt-2">
              *Al comprar se solicitarán datos personales (nombre, DNI, email) para registro en base de datos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {ticketTypes.map((ticket) => (
              <Card
                key={ticket.id}
                className={`relative border-border bg-card hover:border-primary/50 transition-colors ${
                  ticket.popular ? "border-primary shadow-lg shadow-primary/20 scale-105" : ""
                } ${ticket.id === "early" ? "opacity-75" : ""}`}
              >
                {ticket.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Más Popular
                    </Badge>
                  </div>
                )}

                {ticket.id === "early" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive mb-2">AGOTADO</div>
                      <div className="text-sm text-muted-foreground">Oferta finalizada</div>
                    </div>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className={`text-xl ${ticket.popular ? "text-primary" : ""}`}>{ticket.name}</CardTitle>
                  <CardDescription>{ticket.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {ticket.id === "early" && (
                      <span className="line-through text-muted-foreground text-xl">$12.000</span>
                    )}
                    {ticket.id === "early" && <br />}${ticket.basePrice.toLocaleString()}
                    <span className="text-sm text-muted-foreground font-normal"> + servicio</span>
                  </div>
                  <div
                    className={`text-2xl font-semibold ${ticket.variant === "accent" ? "text-accent" : "text-primary"}`}
                  >
                    Total: ${ticket.finalPrice.toLocaleString()}
                  </div>
                  {ticket.id === "early" && (
                    <Badge variant="destructive" className="text-xs">
                      ¡Últimas 24 horas!
                    </Badge>
                  )}
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {ticket.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-3 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(ticket.id, (cart[ticket.id] || 0) - 1)}
                      disabled={!cart[ticket.id] || ticket.id === "early"}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{cart[ticket.id] || 0}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(ticket.id, (cart[ticket.id] || 0) + 1)}
                      disabled={ticket.id === "early"}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    className={`w-full ${
                      ticket.variant === "accent"
                        ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                        : "bg-primary hover:bg-primary/90"
                    }`}
                    onClick={() => {
                      updateQuantity(ticket.id, (cart[ticket.id] || 0) + 1)
                      setShowPreview(true)
                    }}
                    disabled={ticket.id === "early"}
                  >
                    {ticket.id === "early" ? "No Disponible" : "Agregar al Carrito"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {getTotalItems() > 0 && (
            <Card className="max-w-2xl mx-auto border-primary/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Resumen de Compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(cart).map(([ticketId, quantity]) => {
                  const ticket = ticketTypes.find((t) => t.id === ticketId)
                  if (!ticket) return null

                  return (
                    <div key={ticketId} className="flex justify-between items-center py-2 border-b border-border/50">
                      <div>
                        <span className="font-medium">{ticket.name}</span>
                        <span className="text-muted-foreground"> × {quantity}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(ticket.finalPrice * quantity).toLocaleString()}</div>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>Total neto:</span>
                    <span className="font-medium">${getTotalBasePrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Cargo por servicio:</span>
                    <span className="font-medium">${(getTotalPrice() - getTotalBasePrice()).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-primary border-t border-border pt-2">
                    <span>Total final:</span>
                    <span>${getTotalPrice().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-lg py-6">
                  Ir a pagar con Mercado Pago
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">Preguntas Frecuentes</h2>
            </div>
            <p className="text-xl text-muted-foreground">Resolvemos todas tus dudas sobre el evento</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="tickets" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Cómo recibo mi entrada?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Una vez confirmado el pago, recibirás tu código QR único por WhatsApp y email en un máximo de 5 minutos.
                Este QR es tu entrada al evento y debe presentarse en la puerta de acceso. Te recomendamos guardar una
                captura de pantalla como respaldo.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payment" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Qué medios de pago aceptan?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Aceptamos todos los medios de pago disponibles en Mercado Pago: tarjetas de crédito y débito (Visa,
                Mastercard, American Express), transferencias bancarias, Rapipago, Pago Fácil y dinero en cuenta de
                Mercado Pago. Todos los pagos son procesados de forma segura.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="refunds" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Puedo solicitar reembolso?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No se realizan reembolsos por ningún motivo. Todas las ventas son finales. En caso excepcional de
                cancelación del evento por causas de fuerza mayor, se procederá al reembolso del 100% del valor pagado.
                Te recomendamos verificar bien tu compra antes de confirmar el pago.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="transfer" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Puedo cambiar el titular de la entrada?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No se permite el cambio de titular de las entradas. La entrada es personal e intransferible y debe ser
                utilizada por la persona cuyos datos fueron registrados al momento de la compra. Es obligatorio
                presentar DNI que coincida con los datos de la entrada para poder ingresar al evento.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dress-code" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Hay código de vestimenta?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí, el evento tiene dress code elegante casual. Se requiere: calzado cerrado (no ojotas ni crocs),
                pantalón largo para hombres, y vestimenta apropiada para la ocasión. No se permite el ingreso con
                remeras deportivas, shorts o vestimenta de playa. Los portadores de entradas VIP tienen acceso a áreas
                exclusivas con dress code más flexible.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="location" className="border border-border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                ¿Dónde es el evento y cómo llego?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                El evento se realiza en El Club De Los Pescadores, ubicado en Av. Tristán Achával Rodríguez 1650,
                Costanera Norte, CABA. Acceso fácil en auto por Costanera Norte o transporte público hasta Estación
                Belgrano C y luego colectivo 33 o 37. Hay estacionamiento gratuito disponible en el predio del club. Te
                recomendamos llegar temprano para disfrutar de las vistas al río. Las puertas abren a las 22:00 hs.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">¿No encontraste la respuesta que buscabas?</p>
            <Button variant="outline" size="lg">
              Contactar Soporte
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
