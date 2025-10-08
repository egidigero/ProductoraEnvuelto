'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Users, TrendingUp, AlertCircle, Star } from 'lucide-react';
import type { TicketType } from '@/lib/types';

interface TicketTypesManagerProps {
  eventId: string;
  eventName: string;
}

export function TicketTypesManager({ eventId, eventName }: TicketTypesManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'sold_out'>('active');
  const [isPopular, setIsPopular] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('');
  const [features, setFeatures] = useState('');

  useEffect(() => {
    fetchTicketTypes();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ticket-types?event_id=${eventId}`);
      const data = await response.json();
      setTicketTypes(data.ticket_types || []);
    } catch (error) {
      console.error('Error fetching ticket types:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setServiceFee('');
    setCapacity('');
    setStatus('active');
    setIsPopular(false);
    setDisplayOrder('');
    setFeatures('');
    setEditingType(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (ticketType: TicketType) => {
    setEditingType(ticketType);
    setName(ticketType.name);
    setDescription(ticketType.description || '');
    setBasePrice(ticketType.base_price.toString());
    setServiceFee(ticketType.service_fee.toString());
    setCapacity(ticketType.capacity.toString());
    setStatus(ticketType.status);
    setIsPopular(ticketType.is_popular);
    setDisplayOrder(ticketType.display_order.toString());
    setFeatures(ticketType.features.join('\n'));
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const featuresArray = features
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const payload = {
      event_id: eventId,
      name,
      description,
      base_price: parseFloat(basePrice),
      service_fee: parseFloat(serviceFee) || 0,
      capacity: parseInt(capacity),
      status,
      is_popular: isPopular,
      display_order: parseInt(displayOrder) || 0,
      features: featuresArray,
    };

    try {
      let response;
      if (editingType) {
        // Update
        response = await fetch(`/api/ticket-types/${editingType.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        response = await fetch('/api/ticket-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await fetchTicketTypes();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving ticket type:', error);
      alert('Error al guardar el tipo de entrada');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"? Solo se puede eliminar si no hay tickets vendidos.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ticket-types/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTicketTypes();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      alert('Error al eliminar el tipo de entrada');
    }
  };

  const getStatusBadge = (ticketType: TicketType) => {
    if (ticketType.status === 'sold_out') {
      return <Badge variant="destructive">Agotado</Badge>;
    }
    if (ticketType.status === 'inactive') {
      return <Badge variant="secondary">Inactivo</Badge>;
    }
    if ((ticketType.available || 0) <= 10) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Bajo stock</Badge>;
    }
    return <Badge variant="default">Activo</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tipos de Entrada</h3>
          <p className="text-sm text-muted-foreground">{eventName}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Editar Tipo de Entrada' : 'Nuevo Tipo de Entrada'}
              </DialogTitle>
              <DialogDescription>
                Configure los detalles del tipo de entrada, precios y cupos.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="General, VIP, Early Bird"
                  />
                </div>
                <div>
                  <Label htmlFor="displayOrder">Orden de visualización</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Acceso completo al evento"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="basePrice">Precio Base ($) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    required
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="15000"
                  />
                </div>
                <div>
                  <Label htmlFor="serviceFee">Cargo Servicio ($)</Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    step="0.01"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                    placeholder="850"
                  />
                </div>
                <div>
                  <Label>Precio Final</Label>
                  <Input
                    readOnly
                    value={`$${formatPrice((parseFloat(basePrice) || 0) + (parseFloat(serviceFee) || 0))}`}
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="capacity">Capacidad *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="200"
                  />
                  {editingType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vendidos: {editingType.sold_count}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="sold_out">Agotado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={(e) => setIsPopular(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Destacar
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="features">Características (una por línea)</Label>
                <Textarea
                  id="features"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Acceso a todas las áreas&#10;Acceso hasta las 2 AM&#10;Guardarropa incluido"
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingType ? 'Guardar Cambios' : 'Crear Tipo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : ticketTypes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No hay tipos de entrada configurados. Haz clic en "Nuevo Tipo" para crear uno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ticketTypes.map((ticketType) => (
            <Card key={ticketType.id} className="relative">
              {ticketType.is_popular && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Destacada
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{ticketType.name}</span>
                </CardTitle>
                <CardDescription>{ticketType.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-violet-600">
                    ${formatPrice(ticketType.final_price)}
                  </div>
                  {ticketType.service_fee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Base: ${formatPrice(ticketType.base_price)} + 
                      Servicio: ${formatPrice(ticketType.service_fee)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{ticketType.sold_count} / {ticketType.capacity}</span>
                  </div>
                  {getStatusBadge(ticketType)}
                </div>

                {ticketType.sold_count > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Vendidos</span>
                      <span>{ticketType.sold_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-violet-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(ticketType.sold_percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {ticketType.features.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {ticketType.features.length} características incluidas
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(ticketType)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ticketType.id, ticketType.name)}
                    disabled={ticketType.sold_count > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
