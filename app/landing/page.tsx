'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Clock, Star, CheckCircle, Plus, Minus, ShoppingCart, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Event, TicketType } from '@/lib/types';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function EventLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event details
      const eventRes = await fetch(`/api/experiences/${eventId}`);
      if (!eventRes.ok) throw new Error('Event not found');
      const eventData = await eventRes.json();
      setEvent(eventData.event);

      // Fetch ticket types
      const ticketsRes = await fetch(`/api/ticket-types?event_id=${eventId}`);
      if (!ticketsRes.ok) throw new Error('Failed to load ticket types');
      const ticketsData = await ticketsRes.json();
      setTicketTypes(ticketsData.ticket_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketType || !event) return;

    setPurchasing(true);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          ticket_type_id: selectedTicketType.id,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/success?order_id=${data.order_id}`);
      } else {
        alert(`Error: ${data.error || 'Failed to create order'}`);
        
        // Si no hay disponibilidad, refrescar datos
        if (data.error?.includes('available')) {
          await fetchEventData();
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al procesar la compra. Por favor intenta de nuevo.');
    } finally {
      setPurchasing(false);
    }
  };

  const getVariantColor = (ticketType: TicketType) => {
    if (ticketType.is_popular) return 'bg-gradient-to-br from-violet-500 to-purple-600';
    return 'bg-gradient-to-br from-gray-800 to-gray-900';
  };

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-muted-foreground">No se especificó un evento. Por favor usa un link válido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-muted-foreground">{error || 'Evento no encontrado'}</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay un ticket seleccionado, mostrar formulario de compra
  if (selectedTicketType) {
    const totalAmount = selectedTicketType.final_price * quantity;
    const available = selectedTicketType.available || 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedTicketType(null)} className="mb-6">
            ← Volver a tipos de entrada
          </Button>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{event.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.start_at).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </div>
                <div className="mt-2">
                  <Badge>{selectedTicketType.name}</Badge>
                </div>
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handlePurchase}>
              <CardContent className="space-y-6">
                {selectedTicketType.description && (
                  <p className="text-sm text-muted-foreground">{selectedTicketType.description}</p>
                )}

                {/* Features */}
                {selectedTicketType.features && selectedTicketType.features.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Incluye:</p>
                    <ul className="space-y-1">
                      {selectedTicketType.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="juan@email.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recibirás tus entradas en este email
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Cantidad de entradas</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={Math.min(20, available)}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(available, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(available, quantity + 1))}
                        disabled={quantity >= available}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {available} disponibles
                      </span>
                    </div>
                  </div>

                  <div className="bg-violet-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Precio por entrada</span>
                      <span className="font-medium">
                        ${formatPrice(selectedTicketType.final_price)}
                      </span>
                    </div>
                    {selectedTicketType.service_fee > 0 && (
                      <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground">
                        <span>Precio base: ${formatPrice(selectedTicketType.base_price)}</span>
                        <span>+ Cargo servicio: ${formatPrice(selectedTicketType.service_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-violet-200">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-violet-600">
                        ${formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" size="lg" disabled={purchasing || available === 0}>
                  {purchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Ir a pagar
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Al hacer clic, recibirás tus entradas por email inmediatamente
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Vista principal: mostrar tipos de tickets
  const activeTickets = ticketTypes.filter(tt => tt.status === 'active' || tt.status === 'sold_out');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative py-20 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
        <div className="relative max-w-4xl mx-auto">
          <Badge className="mb-4" variant="outline">
            <Calendar className="mr-1 h-3 w-3" />
            {new Date(event.start_at).toLocaleDateString('es-AR', { 
              day: 'numeric', 
              month: 'long',
              year: 'numeric' 
            })}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            {event.name}
          </h1>
          <div className="flex items-center justify-center gap-4 text-purple-200 text-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {event.venue}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {new Date(event.start_at).toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          {event.description && (
            <p className="mt-6 text-lg text-purple-100 max-w-2xl mx-auto">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* Ticket Types Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Elegí tu experiencia
        </h2>

        {activeTickets.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                No hay tipos de entrada disponibles en este momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeTickets.map((ticketType) => {
              const isSoldOut = ticketType.status === 'sold_out' || (ticketType.available || 0) === 0;
              const isLowStock = !isSoldOut && (ticketType.available || 0) <= 10;

              return (
                <Card 
                  key={ticketType.id} 
                  className={`relative overflow-hidden transition-all hover:shadow-xl ${
                    isSoldOut ? 'opacity-60' : ''
                  }`}
                >
                  {ticketType.is_popular && !isSoldOut && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        MÁS ELEGIDA
                      </div>
                    </div>
                  )}

                  {isSoldOut && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="destructive">AGOTADO</Badge>
                    </div>
                  )}

                  <CardHeader className={`${getVariantColor(ticketType)} text-white`}>
                    <CardTitle className="text-2xl">{ticketType.name}</CardTitle>
                    <CardDescription className="text-purple-100">
                      {ticketType.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-violet-600">
                        ${formatPrice(ticketType.final_price)}
                      </div>
                      {ticketType.service_fee > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Base: ${formatPrice(ticketType.base_price)} + 
                          Servicio: ${formatPrice(ticketType.service_fee)}
                        </p>
                      )}
                    </div>

                    {ticketType.features && ticketType.features.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {ticketType.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!isSoldOut && (
                      <div className="text-sm text-muted-foreground">
                        {isLowStock ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            ¡Solo quedan {ticketType.available}!
                          </Badge>
                        ) : (
                          <span>{ticketType.available} disponibles</span>
                        )}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => setSelectedTicketType(ticketType)}
                      disabled={isSoldOut}
                    >
                      {isSoldOut ? 'Agotado' : 'Comprar'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Preguntas frecuentes
        </h2>
        <Accordion type="single" collapsible className="bg-white rounded-lg p-4">
          <AccordionItem value="item-1">
            <AccordionTrigger className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              ¿Cómo recibo mi entrada?
            </AccordionTrigger>
            <AccordionContent>
              Una vez completada tu compra, recibirás un email con tu código QR. 
              Simplemente mostralo en tu teléfono al ingresar al evento.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              ¿Puedo transferir mi entrada?
            </AccordionTrigger>
            <AccordionContent>
              No, las entradas son personales e intransferibles. El código QR solo puede usarse una vez.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              ¿Qué pasa si no recibo el email?
            </AccordionTrigger>
            <AccordionContent>
              Revisa tu carpeta de spam. Si no lo encuentras, contáctanos respondiendo 
              al email de confirmación con tu número de orden.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
