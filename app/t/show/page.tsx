'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin, AlertCircle } from 'lucide-react';
import Image from 'next/image';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function ShowTicketPage() {
  const searchParams = useSearchParams();
  const tkn = searchParams.get('tkn');
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tkn) {
      fetchTicket();
    } else {
      setError('Token no proporcionado');
      setLoading(false);
    }
  }, [tkn]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/show?tkn=${tkn}`);
      const data = await response.json();

      if (response.ok) {
        setTicket(data);
      } else {
        setError(data.error || 'Ticket no encontrado');
      }
    } catch (err) {
      setError('Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-red-600">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      valid: { label: 'Válido', variant: 'default' },
      used: { label: 'Usado', variant: 'secondary' },
      revoked: { label: 'Revocado', variant: 'destructive' },
      expired: { label: 'Expirado', variant: 'outline' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Tu Entrada</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg border-2 border-violet-200">
              {ticket.qr_code && (
                <div className="relative w-full aspect-square">
                  <Image
                    src={ticket.qr_code}
                    alt="QR Code"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              {getStatusBadge(ticket.status)}
            </div>

            {ticket.used_at && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Usado el {new Date(ticket.used_at).toLocaleString('es-AR')}
                </p>
              </div>
            )}

            {/* Event Details */}
            {ticket.event && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-lg">{ticket.event.name}</h3>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(ticket.event.start_at).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{ticket.event.venue}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            {ticket.metadata && (
              <div className="bg-violet-50 p-3 rounded-lg text-sm">
                {ticket.metadata.ticket_number && (
                  <p>
                    Ticket {ticket.metadata.ticket_number} de {ticket.metadata.total_tickets}
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Presenta este código QR en la entrada del evento. 
                Solo puede usarse una vez.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ticket ID: {ticket.ticket_id}
        </p>
      </div>
    </div>
  );
}
