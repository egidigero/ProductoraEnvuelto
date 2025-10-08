"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, MapPin, Clock, Star, CheckCircle, Plus, Minus, ShoppingCart, HelpCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"

interface TicketType {
  id: string
  name: string
  description: string | null
  base_price: number
  service_fee: number
  final_price: number
  features: string[]
  status: string
  is_popular: boolean
  capacity: number
  sold_count: number
  available: number
}

interface Attendee {
  firstName: string
  lastName: string
  dni: string
  ticketTypeId: string
  ticketTypeName: string
}

export default function EventLandingPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showAttendeeForm, setShowAttendeeForm] = useState(false)
  
  // Email único para todos los tickets
  const [buyerEmail, setBuyerEmail] = useState("")
  
  // Lista de asistentes (uno por cada ticket)
  const [attendees, setAttendees] = useState<Attendee[]>([])

  // Cargar tipos de tickets dinámicamente al montar el componente
  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        const response = await fetch('/api/ticket-types')
        const data = await response.json()
        
        if (response.ok && data.ticket_types) {
          setTicketTypes(data.ticket_types)
        } else {
          console.error('Error loading ticket types:', data.error)
        }
      } catch (error) {
        console.error('Error fetching ticket types:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTicketTypes()
  }, [])

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
      return sum + (ticket ? ticket.final_price * qty : 0)
    }, 0)
  }

  const getTotalBasePrice = () => {
    return Object.entries(cart).reduce((sum, [ticketId, qty]) => {
      const ticket = ticketTypes.find((t) => t.id === ticketId)
      return sum + (ticket ? ticket.base_price * qty : 0)
    }, 0)
  }

  // Verificar si un ticket está agotado o inactivo
  const isTicketSoldOut = (ticket: TicketType) => {
    return ticket.status === 'sold_out' || ticket.status === 'inactive' || ticket.available <= 0
  }

  // Inicializar o actualizar formulario de asistentes (mantiene datos existentes)
  const initializeAttendeeForm = () => {
    const newAttendees: Attendee[] = []
    const existingAttendeesMap = new Map(
      attendees.map(a => [`${a.ticketTypeId}-${a.firstName}-${a.lastName}-${a.dni}`, a])
    )
    
    Object.entries(cart).forEach(([ticketTypeId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketTypeId)
      if (ticket) {
        // Mantener asistentes existentes de este tipo
        const existingOfThisType = attendees.filter(a => a.ticketTypeId === ticketTypeId)
        
        for (let i = 0; i < quantity; i++) {
          if (i < existingOfThisType.length) {
            // Mantener datos existentes
            newAttendees.push(existingOfThisType[i])
          } else {
            // Agregar nuevo asistente vacío
            newAttendees.push({
              firstName: "",
              lastName: "",
              dni: "",
              ticketTypeId: ticketTypeId,
              ticketTypeName: ticket.name
            })
          }
        }
      }
    })
    
    setAttendees(newAttendees)
    setShowAttendeeForm(true)
  }

  // Sincronizar carrito con formulario de asistentes cuando cambia el carrito
  useEffect(() => {
    if (showAttendeeForm) {
      initializeAttendeeForm()
    }
  }, [cart])

  // Actualizar datos de un asistente
  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const newAttendees = [...attendees]
    newAttendees[index] = { ...newAttendees[index], [field]: value }
    setAttendees(newAttendees)
  }

  // Procesar compra (simulando pago exitoso)
  const handlePurchase = async () => {
    if (!buyerEmail.trim()) {
      alert("Por favor ingresa un email")
      return
    }

    // Validar que todos los asistentes tengan datos completos
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i]
      if (!attendee.firstName.trim() || !attendee.lastName.trim() || !attendee.dni.trim()) {
        alert(`Por favor completa todos los datos del asistente ${i + 1}`)
        return
      }
    }

    setProcessing(true)

    try {
      // Crear orden con todos los asistentes
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_email: buyerEmail,
          attendees: attendees,
          simulate_payment: true // Para simular pago exitoso sin MercadoPago
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la compra')
      }

      // Redirigir a página de éxito
      window.location.href = `/success?order_id=${data.order_id}&order_reference=${data.order_reference}`

    } catch (error: any) {
      console.error('Error al procesar compra:', error)
      alert(error.message || 'Error al procesar la compra. Por favor intenta nuevamente.')
    } finally {
      setProcessing(false)
    }
  }

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando experiencias...</p>
        </div>
      </div>
    )
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

          {ticketTypes.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No hay tipos de entradas disponibles en este momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {ticketTypes.map((ticket) => {
                const isSoldOut = isTicketSoldOut(ticket)
                const isLowStock = ticket.available > 0 && ticket.available <= 10

                return (
                  <Card
                    key={ticket.id}
                    className={`relative border-border bg-card hover:border-primary/50 transition-colors ${
                      ticket.is_popular ? "border-primary shadow-lg shadow-primary/20 scale-105" : ""
                    } ${isSoldOut ? "opacity-75" : ""}`}
                  >
                    {ticket.is_popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1">
                          <Star className="w-3 h-3 mr-1" />
                          Más Popular
                        </Badge>
                      </div>
                    )}

                    {isSoldOut && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-destructive mb-2">AGOTADO</div>
                          <div className="text-sm text-muted-foreground">
                            {ticket.sold_count}/{ticket.capacity} vendidas
                          </div>
                        </div>
                      </div>
                    )}

                    <CardHeader>
                      <CardTitle className={`text-xl ${ticket.is_popular ? "text-primary" : ""}`}>
                        {ticket.name}
                      </CardTitle>
                      <CardDescription>{ticket.description || "Experiencia única"}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">
                        {formatPrice(ticket.base_price)}
                        <span className="text-sm text-muted-foreground font-normal"> + servicio</span>
                      </div>
                      <div className="text-2xl font-semibold text-primary">
                        Total: {formatPrice(ticket.final_price)}
                      </div>
                      
                      {/* Indicador de disponibilidad */}
                      {!isSoldOut && (
                        <div className="text-sm space-y-1">
                          {isLowStock ? (
                            <Badge variant="destructive" className="text-xs">
                              ¡Solo quedan {ticket.available} entradas!
                            </Badge>
                          ) : (
                            <div className="text-muted-foreground">
                              {ticket.available} disponibles de {ticket.capacity}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Features */}
                      {ticket.features && ticket.features.length > 0 && (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {ticket.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                      <div className="flex items-center justify-center gap-3 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(ticket.id, (cart[ticket.id] || 0) - 1)}
                          disabled={!cart[ticket.id] || isSoldOut}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{cart[ticket.id] || 0}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(ticket.id, (cart[ticket.id] || 0) + 1)}
                          disabled={isSoldOut}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        className="w-full bg-primary hover:bg-primary/90"
                        onClick={() => {
                          updateQuantity(ticket.id, (cart[ticket.id] || 0) + 1)
                          setShowPreview(true)
                        }}
                        disabled={isSoldOut}
                      >
                        {isSoldOut ? "No Disponible" : "Agregar al Carrito"}
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Resumen de compra */}
          {getTotalItems() > 0 && !showAttendeeForm && (
            <Card className="max-w-2xl mx-auto border-primary/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Resumen de Compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Items del carrito */}
                <div className="space-y-2">
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
                          <div className="font-medium">{formatPrice(ticket.final_price * quantity)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Totales */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>Total neto:</span>
                    <span className="font-medium">{formatPrice(getTotalBasePrice())}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Cargo por servicio:</span>
                    <span className="font-medium">{formatPrice(getTotalPrice() - getTotalBasePrice())}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-primary border-t border-border pt-2">
                    <span>Total final:</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>

                {/* Email para recibir todos los tickets */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">Email de Contacto</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="juan.perez@email.com"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Recibirás todos los QR codes en este email ({getTotalItems()} {getTotalItems() === 1 ? 'entrada' : 'entradas'})
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  size="lg" 
                  className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
                  onClick={initializeAttendeeForm}
                  disabled={!buyerEmail.trim()}
                >
                  Continuar
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Formulario de asistentes */}
          {showAttendeeForm && (
            <Card className="max-w-3xl mx-auto border-primary/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Datos de los Asistentes</CardTitle>
                <CardDescription>
                  Completa la información de cada persona que asistirá al evento. 
                  Se generará un QR individual para cada uno.
                  <div className="mt-2 text-sm font-medium text-primary">
                    ¿Quieres agregar más tickets? Haz clic en "Volver al Carrito" y agrega más entradas.
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto">
                {attendees.map((attendee, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-4 bg-background">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-base">
                        Asistente {index + 1} - <Badge variant="outline">{attendee.ticketTypeName}</Badge>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre *</label>
                        <input
                          type="text"
                          value={attendee.firstName}
                          onChange={(e) => updateAttendee(index, 'firstName', e.target.value)}
                          placeholder="Juan"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Apellido *</label>
                        <input
                          type="text"
                          value={attendee.lastName}
                          onChange={(e) => updateAttendee(index, 'lastName', e.target.value)}
                          placeholder="Pérez"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">DNI *</label>
                      <input
                        type="text"
                        value={attendee.dni}
                        onChange={(e) => updateAttendee(index, 'dni', e.target.value.replace(/\D/g, ''))}
                        placeholder="12345678"
                        maxLength={8}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                      <p className="text-xs text-muted-foreground">Solo números, sin puntos ni espacios</p>
                    </div>
                  </div>
                ))}

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Total a pagar</p>
                      <p className="text-sm text-muted-foreground">
                        Todos los QR se enviarán a: <span className="font-medium">{buyerEmail}</span>
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(getTotalPrice())}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button 
                  variant="outline"
                  size="lg" 
                  className="flex-1"
                  onClick={() => setShowAttendeeForm(false)}
                >
                  Volver al Carrito
                </Button>
                <Button 
                  size="lg" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-lg py-6"
                  onClick={handlePurchase}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Compra'
                  )}
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
