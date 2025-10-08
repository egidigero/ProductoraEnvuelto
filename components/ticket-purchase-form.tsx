"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { TicketFormData, Attendee } from "@/lib/types"

interface TicketPurchaseFormProps {
  ticketType: "general" | "vip" | "early"
  quantity: number
  onClose: () => void
}

export function TicketPurchaseForm({ ticketType, quantity, onClose }: TicketPurchaseFormProps) {
  const [formData, setFormData] = useState<TicketFormData>({
    buyerFirstName: "",
    buyerLastName: "",
    buyerDni: "",
    buyerEmail: "",
    buyerPhone: "",
    attendees: Array.from({ length: quantity }, () => ({
      firstName: "",
      lastName: "",
      dni: "",
      email: "",
    })),
    ticketType,
    quantity,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submission started")
    console.log("[v0] Form data:", formData)

    setIsLoading(true)
    setErrors({})

    const validationErrors: Record<string, string> = {}

    if (!formData.buyerFirstName.trim()) validationErrors.buyerFirstName = "Nombre del comprador requerido"
    if (!formData.buyerLastName.trim()) validationErrors.buyerLastName = "Apellido del comprador requerido"
    if (!formData.buyerDni.trim()) validationErrors.buyerDni = "DNI del comprador requerido"
    if (!formData.buyerEmail.trim()) validationErrors.buyerEmail = "Email del comprador requerido"

    formData.attendees.forEach((attendee, index) => {
      if (!attendee.firstName.trim())
        validationErrors[`attendee_${index}_firstName`] = `Nombre del asistente ${index + 1} requerido`
      if (!attendee.lastName.trim())
        validationErrors[`attendee_${index}_lastName`] = `Apellido del asistente ${index + 1} requerido`
      if (!attendee.dni.trim()) validationErrors[`attendee_${index}_dni`] = `DNI del asistente ${index + 1} requerido`
      if (!attendee.email.trim())
        validationErrors[`attendee_${index}_email`] = `Email del asistente ${index + 1} requerido`
    })

    if (Object.keys(validationErrors).length > 0) {
      console.log("[v0] Validation errors:", validationErrors)
      setErrors(validationErrors)
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] Sending request to /api/tickets")
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, testMode: true }),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      const result = await response.json()
      console.log("[v0] Response data:", result)

      if (!response.ok) {
        console.log("[v0] Server error:", result.error)
        setErrors({ general: result.error })
        return
      }

      if (result.testMode) {
        console.log("[v0] Test mode success, showing alert")
        alert(
          `¡Compra exitosa! Se generaron ${quantity} tickets con QR codes. Revisa el dashboard para ver los detalles.`,
        )
        onClose()
        return
      }

      // Redirigir a Mercado Pago (solo en modo producción)
      console.log("[v0] Redirecting to Mercado Pago:", result.paymentUrl)
      window.location.href = result.paymentUrl
    } catch (error) {
      console.error("[v0] Network error:", error)
      setErrors({ general: "Error de conexión. Intenta nuevamente." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuyerChange = (
    field: keyof Omit<TicketFormData, "attendees" | "ticketType" | "quantity">,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleAttendeeChange = (index: number, field: keyof Attendee, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.map((attendee, i) => (i === index ? { ...attendee, [field]: value } : attendee)),
    }))
    const errorKey = `attendee_${index}_${field}`
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }))
    }
  }

  const prices = {
    early: 15000,
    general: 18000,
    vip: 25000,
  }

  const basePrice = prices[ticketType] * quantity
  const serviceCharge = Math.round(basePrice * 0.1)
  const totalAmount = basePrice + serviceCharge

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-800 my-8">
        <CardHeader>
          <CardTitle className="text-white">Información de Compra</CardTitle>
          <p className="text-gray-400 text-sm">
            {quantity}x {ticketType.toUpperCase()} - ${totalAmount.toLocaleString()}
          </p>
          <p className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">
            🧪 MODO PRUEBA - No se procesará pago real
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Datos del Comprador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerFirstName" className="text-white">
                    Nombre *
                  </Label>
                  <Input
                    id="buyerFirstName"
                    value={formData.buyerFirstName}
                    onChange={(e) => handleBuyerChange("buyerFirstName", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerLastName" className="text-white">
                    Apellido *
                  </Label>
                  <Input
                    id="buyerLastName"
                    value={formData.buyerLastName}
                    onChange={(e) => handleBuyerChange("buyerLastName", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerDni" className="text-white">
                    DNI *
                  </Label>
                  <Input
                    id="buyerDni"
                    value={formData.buyerDni}
                    onChange={(e) => handleBuyerChange("buyerDni", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="12345678"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerEmail" className="text-white">
                    Email *
                  </Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => handleBuyerChange("buyerEmail", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="buyerPhone" className="text-white">
                    Teléfono (opcional)
                  </Label>
                  <Input
                    id="buyerPhone"
                    value={formData.buyerPhone}
                    onChange={(e) => handleBuyerChange("buyerPhone", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Datos de los Asistentes ({quantity} {quantity === 1 ? "persona" : "personas"})
              </h3>
              <div className="space-y-6">
                {formData.attendees.map((attendee, index) => (
                  <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="text-white font-medium mb-3">Asistente {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`attendee_${index}_firstName`} className="text-white">
                          Nombre *
                        </Label>
                        <Input
                          id={`attendee_${index}_firstName`}
                          value={attendee.firstName}
                          onChange={(e) => handleAttendeeChange(index, "firstName", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`attendee_${index}_lastName`} className="text-white">
                          Apellido *
                        </Label>
                        <Input
                          id={`attendee_${index}_lastName`}
                          value={attendee.lastName}
                          onChange={(e) => handleAttendeeChange(index, "lastName", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`attendee_${index}_dni`} className="text-white">
                          DNI *
                        </Label>
                        <Input
                          id={`attendee_${index}_dni`}
                          value={attendee.dni}
                          onChange={(e) => handleAttendeeChange(index, "dni", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="12345678"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`attendee_${index}_email`} className="text-white">
                          Email *
                        </Label>
                        <Input
                          id={`attendee_${index}_email`}
                          type="email"
                          value={attendee.email}
                          onChange={(e) => handleAttendeeChange(index, "email", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2">Errores en el formulario:</h4>
                <ul className="text-red-300 text-sm space-y-1">
                  {Object.entries(errors).map(([key, error]) => (
                    <li key={key}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {isLoading ? "Procesando..." : "🧪 Simular Compra (Prueba)"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
