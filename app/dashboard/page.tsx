"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Ticket,
  DollarSign,
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react"

interface Purchase {
  id: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerDni: string
  totalAmount: number
  status: string
  createdAt: string
  mercadoPagoId: string
  attendees: Attendee[]
}

interface Attendee {
  id: string
  name: string
  lastName: string
  dni: string
  email: string
  ticketType: string
  qrToken: string
  scannedAt: string | null
  isRevoked: boolean
}

interface Stats {
  totalSales: number
  totalTickets: number
  scannedTickets: number
  revenue: number
  pendingTickets: number
  revokedTickets: number
}

interface Experience {
  id: string
  name: string
  description: string
  price: number
  maxCapacity: number
  currentSold: number
  status: "active" | "inactive" | "sold_out"
  eventDate: string
  location: string
  createdAt: string
  features?: string[]
}

export default function Dashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalTickets: 0,
    scannedTickets: 0,
    revenue: 0,
    pendingTickets: 0,
    revokedTickets: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [showExperienceDialog, setShowExperienceDialog] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [experienceForm, setExperienceForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    serviceFeePercent: "5",
    maxCapacity: "",
    status: "active" as "active" | "inactive" | "sold_out",
    features: [] as string[],
  })
  const [newFeature, setNewFeature] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      console.log("[v0] Fetching dashboard data...")
      setError(null)
      setRefreshing(true)

      // Usar la nueva API que incluye ticket types
      const response = await fetch("/api/dashboard/stats-v2")
      const data = await response.json()

      console.log("[v0] Dashboard response:", data)

      if (data.success) {
        setPurchases(data.purchases || [])
        setStats(data.stats || stats)
        // Mapear ticket_types a experiences para compatibilidad
        if (data.ticketTypes) {
          const mappedExperiences = data.ticketTypes.map((tt: any) => ({
            id: tt.id,
            name: tt.name,
            description: tt.description || '',
            price: tt.price,
            maxCapacity: tt.capacity,
            currentSold: tt.sold_count,
            status: tt.status,
            eventDate: new Date().toISOString(), // Hardcoded para evento único
            location: 'El Club De Los Pescadores', // Hardcoded
            createdAt: new Date().toISOString(),
            features: Array.isArray(tt.features) ? tt.features : [],
          }))
          setExperiences(mappedExperiences)
        }
      } else {
        setError(data.error || "Error desconocido")
      }
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
      setError("Error de conexión. Verifica tu conexión a internet.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateQRForAttendee = async (attendeeId: string, attendeeName: string) => {
    try {
      console.log("[v0] Generating QR for attendee:", attendeeId)

      const response = await fetch(`/api/tickets/generate-qr/${attendeeId}`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success && data.qrCode) {
        const link = document.createElement("a")
        link.href = data.qrCode
        link.download = `ticket-${attendeeName.replace(/\s+/g, "-")}-${attendeeId}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        console.log("[v0] QR downloaded successfully")
      } else {
        alert("Error generando QR: " + (data.error || "Error desconocido"))
      }
    } catch (error) {
      console.error("[v0] Error generating QR:", error)
      alert("Error de conexión al generar QR")
    }
  }

  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingExperience ? "PATCH" : "POST"
      const url = editingExperience ? `/api/ticket-types/${editingExperience.id}` : "/api/ticket-types"

      const basePrice = Number.parseFloat(experienceForm.basePrice)
      const serviceFeePercent = Number.parseFloat(experienceForm.serviceFeePercent)
      const serviceFee = Math.round((basePrice * serviceFeePercent) / 100)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: experienceForm.name,
          description: experienceForm.description,
          base_price: basePrice,
          service_fee: serviceFee,
          capacity: Number.parseInt(experienceForm.maxCapacity),
          status: experienceForm.status,
          is_popular: false,
          display_order: 0,
          features: experienceForm.features,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchDashboardData() // Recargar todo el dashboard
        setShowExperienceDialog(false)
        setEditingExperience(null)
        setExperienceForm({
          name: "",
          description: "",
          basePrice: "",
          serviceFeePercent: "5",
          maxCapacity: "",
          status: "active",
          features: [],
        })
        setNewFeature("")
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      console.error("[v0] Error saving experience:", error)
      alert("Error de conexión")
    }
  }

  const handleEditExperience = async (experience: Experience) => {
    setEditingExperience(experience)
    
    try {
      // Obtener los datos completos del ticket type desde la API
      const response = await fetch(`/api/ticket-types/${experience.id}`)
      const data = await response.json()
      
      if (data.success && data.ticket_type) {
        const ticketType = data.ticket_type
        
        console.log('[Dashboard] Ticket type loaded:', ticketType)
        console.log('[Dashboard] Features:', ticketType.features)
        
        // Calcular el porcentaje de servicio desde base_price y service_fee
        const serviceFeePercent = ticketType.base_price > 0 
          ? Math.round((ticketType.service_fee / ticketType.base_price) * 100)
          : 5
        
        setExperienceForm({
          name: ticketType.name,
          description: ticketType.description || '',
          basePrice: ticketType.base_price.toString(),
          serviceFeePercent: serviceFeePercent.toString(),
          maxCapacity: ticketType.capacity.toString(),
          status: ticketType.status,
          features: Array.isArray(ticketType.features) ? ticketType.features : [],
        })
      } else {
        // Fallback si falla la API - usar datos del objeto experience
        const serviceFeePercent = experience.price > 0 
          ? Math.round(((experience.price - (experience.price / 1.05)) / (experience.price / 1.05)) * 100)
          : 5
        
        setExperienceForm({
          name: experience.name,
          description: experience.description,
          basePrice: Math.round(experience.price / 1.05).toString(),
          serviceFeePercent: serviceFeePercent.toString(),
          maxCapacity: experience.maxCapacity.toString(),
          status: experience.status,
          features: [],
        })
      }
    } catch (error) {
      console.error('Error loading ticket type details:', error)
      // Fallback en caso de error
      const serviceFeePercent = experience.price > 0 
        ? Math.round(((experience.price - (experience.price / 1.05)) / (experience.price / 1.05)) * 100)
        : 5
      
      setExperienceForm({
        name: experience.name,
        description: experience.description,
        basePrice: Math.round(experience.price / 1.05).toString(),
        serviceFeePercent: serviceFeePercent.toString(),
        maxCapacity: experience.maxCapacity.toString(),
        status: experience.status,
        features: [],
      })
    }
    
    setShowExperienceDialog(true)
  }

  const handleDeleteExperience = async (experienceId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta experiencia?")) return

    try {
      const response = await fetch(`/api/ticket-types/${experienceId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await fetchDashboardData() // Recargar todo el dashboard
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      console.error("[v0] Error deleting experience:", error)
      alert("Error de conexión")
    }
  }

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.buyerDni.includes(searchTerm) ||
      purchase.attendees.some(
        (attendee) =>
          attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.dni.includes(searchTerm) ||
          attendee.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - ON REPEAT</h1>
          <p className="text-muted-foreground">Gestión de tickets para El Club De Los Pescadores</p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="experiences">Experiencias</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{stats.totalSales} compras realizadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Vendidos</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTickets}</div>
                  <p className="text-xs text-muted-foreground">Entradas emitidas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Escaneados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.scannedTickets}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalTickets > 0 ? ((stats.scannedTickets / stats.totalTickets) * 100).toFixed(1) : 0}%
                    ingresaron
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Experiencias</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{experiences.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {experiences.filter((e) => e.status === "active").length} activas
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchDashboardData} variant="outline" disabled={refreshing}>
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>

            {/* Tickets Content */}
            {filteredPurchases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm ? "No se encontraron resultados" : "No hay compras aún"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Las compras aparecerán aquí cuando los usuarios compren tickets"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Compras de Tickets ({filteredPurchases.length})</CardTitle>
                  <CardDescription>Lista completa de todas las compras realizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredPurchases.map((purchase) => (
                      <div key={purchase.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{purchase.buyerName}</h3>
                            <p className="text-sm text-muted-foreground">{purchase.buyerEmail}</p>
                            <p className="text-sm text-muted-foreground">DNI: {purchase.buyerDni}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(purchase.createdAt).toLocaleDateString("es-AR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              - ${purchase.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>
                            {purchase.status === "completed" ? "Pagado" : "Pendiente"}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Asistentes ({purchase.attendees.length})</h4>
                          {purchase.attendees.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center justify-between bg-muted/50 p-3 rounded"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {attendee.name} {attendee.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  DNI: {attendee.dni} | {attendee.email}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {attendee.ticketType}
                                  </Badge>
                                  {attendee.isRevoked && (
                                    <Badge variant="destructive" className="text-xs">
                                      Revocado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {attendee.scannedAt ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs">
                                      {new Date(attendee.scannedAt).toLocaleDateString("es-AR")}
                                    </span>
                                  </div>
                                ) : attendee.isRevoked ? (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-xs">Revocado</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-xs">Pendiente</span>
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    generateQRForAttendee(attendee.id, `${attendee.name}-${attendee.lastName}`)
                                  }
                                  disabled={attendee.isRevoked}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Experiences Management Tab */}
          <TabsContent value="experiences" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Experiencias</h2>
                <p className="text-muted-foreground">Crea y gestiona las experiencias disponibles para el evento</p>
              </div>
              <Dialog open={showExperienceDialog} onOpenChange={setShowExperienceDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingExperience(null)
                      setExperienceForm({
                        name: "",
                        description: "",
                        basePrice: "",
                        serviceFeePercent: "5",
                        maxCapacity: "",
                        status: "active",
                        features: [],
                      })
                      setNewFeature("")
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Experiencia
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingExperience ? "Editar Experiencia" : "Nueva Experiencia"}</DialogTitle>
                    <DialogDescription>
                      {editingExperience
                        ? "Modifica los datos de la experiencia"
                        : "Crea una nueva experiencia para el evento"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleExperienceSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre de la Experiencia</Label>
                      <Input
                        id="name"
                        value={experienceForm.name}
                        onChange={(e) => setExperienceForm({ ...experienceForm, name: e.target.value })}
                        placeholder="Ej: VIP Experience"
                        required
                      />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={experienceForm.description}
                        onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
                        placeholder="Describe qué incluye esta experiencia..."
                        rows={3}
                        required
                      />
                    </div>

                    {/* Precios */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">Precio Base ($)</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          value={experienceForm.basePrice}
                          onChange={(e) => setExperienceForm({ ...experienceForm, basePrice: e.target.value })}
                          placeholder="15000"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceFeePercent">Cargo Servicio (%)</Label>
                        <Input
                          id="serviceFeePercent"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={experienceForm.serviceFeePercent}
                          onChange={(e) => setExperienceForm({ ...experienceForm, serviceFeePercent: e.target.value })}
                          placeholder="5"
                          required
                        />
                      </div>
                    </div>

                    {/* Precio Final Calculado */}
                    {experienceForm.basePrice && experienceForm.serviceFeePercent && (
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Precio Final:</span>
                          <span className="font-bold text-lg">
                            ${(
                              Number.parseFloat(experienceForm.basePrice) +
                              Math.round((Number.parseFloat(experienceForm.basePrice) * Number.parseFloat(experienceForm.serviceFeePercent)) / 100)
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Base: ${Number.parseFloat(experienceForm.basePrice || "0").toLocaleString()} + 
                          Servicio: ${Math.round((Number.parseFloat(experienceForm.basePrice || "0") * Number.parseFloat(experienceForm.serviceFeePercent || "0")) / 100).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Capacidad y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxCapacity">Capacidad Máxima</Label>
                        <Input
                          id="maxCapacity"
                          type="number"
                          value={experienceForm.maxCapacity}
                          onChange={(e) => setExperienceForm({ ...experienceForm, maxCapacity: e.target.value })}
                          placeholder="100"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <Select
                          value={experienceForm.status}
                          onValueChange={(value: any) => setExperienceForm({ ...experienceForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activa</SelectItem>
                            <SelectItem value="inactive">Inactiva</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Beneficios/Features */}
                    <div className="space-y-2">
                      <Label>Beneficios Incluidos</Label>
                      <div className="space-y-2">
                        {experienceForm.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span className="flex-1 text-sm">{feature}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFeatures = experienceForm.features.filter((_, i) => i !== index)
                                setExperienceForm({ ...experienceForm, features: newFeatures })
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <div className="flex gap-2">
                          <Input
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            placeholder="Ej: Acceso a todas las áreas"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newFeature.trim()) {
                                  setExperienceForm({
                                    ...experienceForm,
                                    features: [...experienceForm.features, newFeature.trim()]
                                  })
                                  setNewFeature("")
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newFeature.trim()) {
                                setExperienceForm({
                                  ...experienceForm,
                                  features: [...experienceForm.features, newFeature.trim()]
                                })
                                setNewFeature("")
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Presiona Enter o click en + para agregar un beneficio
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowExperienceDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">{editingExperience ? "Actualizar" : "Crear"} Experiencia</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {experiences.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay experiencias creadas</h3>
                    <p className="text-muted-foreground mb-4">
                      Crea tu primera experiencia para comenzar a vender tickets
                    </p>
                    <Button onClick={() => setShowExperienceDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Experiencia
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {experiences.map((experience) => (
                    <Card key={experience.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {experience.name}
                              <Badge
                                variant={
                                  experience.status === "active"
                                    ? "default"
                                    : experience.status === "sold_out"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {experience.status === "active"
                                  ? "Activa"
                                  : experience.status === "sold_out"
                                    ? "Agotada"
                                    : "Inactiva"}
                              </Badge>
                            </CardTitle>
                            <CardDescription>{experience.description}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditExperience(experience)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteExperience(experience.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">Precio</p>
                            <p className="text-2xl font-bold">${experience.price.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Vendidos</p>
                            <p className="text-2xl font-bold">{experience.currentSold}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Disponibles</p>
                            <p className="text-2xl font-bold">{experience.maxCapacity - experience.currentSold}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Ocupación</p>
                            <p className="text-2xl font-bold">
                              {experience.maxCapacity > 0
                                ? Math.round((experience.currentSold / experience.maxCapacity) * 100)
                                : 0}
                              %
                            </p>
                          </div>
                        </div>
                        {experience.features && experience.features.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Beneficios incluidos:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {experience.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>📅 {new Date(experience.eventDate).toLocaleDateString("es-AR")}</span>
                            <span>📍 {experience.location}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
