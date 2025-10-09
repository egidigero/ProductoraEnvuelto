import { type NextRequest, NextResponse } from "next/server"
import type { TicketPurchase, TicketFormData, Attendee } from "@/lib/types"

// Mark as dynamic route
export const dynamic = 'force-dynamic'

// Simulación de base de datos (reemplazar con tu DB real)
const ticketDatabase: TicketPurchase[] = []

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API /tickets POST called")
    const formData: TicketFormData & { testMode?: boolean } = await request.json()

    console.log("[v0] Processing ticket purchase:", {
      testMode: formData.testMode,
      quantity: formData.quantity,
      ticketType: formData.ticketType,
      buyerName: `${formData.buyerFirstName} ${formData.buyerLastName}`,
      attendeesCount: formData.attendees?.length || 0,
    })

    if (!formData.buyerFirstName || !formData.buyerLastName || !formData.buyerDni || !formData.buyerEmail) {
      console.log("[v0] Missing buyer data:", {
        firstName: !!formData.buyerFirstName,
        lastName: !!formData.buyerLastName,
        dni: !!formData.buyerDni,
        email: !!formData.buyerEmail,
      })
      return NextResponse.json({ error: "Todos los datos del comprador son obligatorios" }, { status: 400 })
    }

    if (!formData.attendees || formData.attendees.length !== formData.quantity) {
      console.log("[v0] Attendees mismatch:", {
        attendeesLength: formData.attendees?.length || 0,
        expectedQuantity: formData.quantity,
      })
      return NextResponse.json({ error: "Debe proporcionar información de todos los asistentes" }, { status: 400 })
    }

    for (let i = 0; i < formData.attendees.length; i++) {
      const attendee = formData.attendees[i]
      if (!attendee.firstName || !attendee.lastName || !attendee.dni || !attendee.email) {
        return NextResponse.json(
          {
            error: `Todos los campos del asistente ${i + 1} son obligatorios`,
          },
          { status: 400 },
        )
      }

      // Validate DNI for each attendee
      if (attendee.dni.length < 7 || attendee.dni.length > 8) {
        return NextResponse.json(
          {
            error: `DNI del asistente ${i + 1} debe tener entre 7 y 8 dígitos`,
          },
          { status: 400 },
        )
      }
    }

    // Validar DNI del comprador
    if (formData.buyerDni.length < 7 || formData.buyerDni.length > 8) {
      return NextResponse.json({ error: "DNI del comprador debe tener entre 7 y 8 dígitos" }, { status: 400 })
    }

    const allDnis = [formData.buyerDni, ...formData.attendees.map((a: Attendee) => a.dni)]
    const uniqueDnis = new Set(allDnis)
    if (uniqueDnis.size !== allDnis.length) {
      return NextResponse.json({ error: "No se pueden repetir DNIs entre asistentes" }, { status: 400 })
    }

    // Calcular precio total
    const prices: Record<'early' | 'general' | 'vip', number> = {
      early: 15000,
      general: 18000,
      vip: 25000,
    }

    const basePrice = prices[formData.ticketType] * formData.quantity
    const serviceCharge = Math.round(basePrice * 0.1)
    const totalAmount = basePrice + serviceCharge

    const purchase: TicketPurchase = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      buyerFirstName: formData.buyerFirstName,
      buyerLastName: formData.buyerLastName,
      buyerDni: formData.buyerDni,
      buyerEmail: formData.buyerEmail,
      buyerPhone: formData.buyerPhone,
      attendees: formData.attendees,
      ticketType: formData.ticketType,
      quantity: formData.quantity,
      totalAmount,
      paymentStatus: formData.testMode ? "completed" : "pending",
      purchaseDate: new Date(),
      eventDate: new Date("2024-12-15T22:00:00"),
    }

    // Guardar en "base de datos" (reemplazar con tu DB)
    ticketDatabase.push(purchase)

    console.log("[v0] Purchase saved:", purchase.id)

    if (formData.testMode) {
      console.log("[v0] Test mode: Simulating successful payment and generating QR codes")

      const qrCodes = []
      for (let i = 0; i < purchase.attendees.length; i++) {
        const attendee = purchase.attendees[i]
        const qrToken = `qr_${purchase.id}_${i}_${Math.random().toString(36).substr(2, 9)}`
        const qrData = {
          attendeeIndex: i,
          attendeeName: `${attendee.firstName} ${attendee.lastName}`,
          qrToken,
          qrUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/scan?tkn=${qrToken}`,
        }
        qrCodes.push(qrData)
        console.log(`[v0] Generated QR for attendee ${i + 1}:`, qrData.qrToken)
      }

      console.log("[v0] All QR codes generated successfully:", qrCodes.length)

      return NextResponse.json({
        success: true,
        testMode: true,
        purchaseId: purchase.id,
        totalAmount: purchase.totalAmount,
        qrCodes,
        message: `Compra simulada exitosamente. Se generaron ${qrCodes.length} QR codes.`,
      })
    }

    // Aquí integrarías con Mercado Pago (solo en modo producción)
    const mercadoPagoUrl = await createMercadoPagoPayment(purchase)

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      paymentUrl: mercadoPagoUrl,
      totalAmount: purchase.totalAmount,
    })
  } catch (error) {
    console.error("[v0] Error processing ticket purchase:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    tickets: ticketDatabase.map((ticket) => ({
      ...ticket,
      attendeeCount: ticket.attendees.length,
      attendeeNames: ticket.attendees.map((a: Attendee) => `${a.firstName} ${a.lastName}`).join(", "),
    })),
    totalSales: ticketDatabase.reduce((sum, ticket) => sum + ticket.totalAmount, 0),
    totalTickets: ticketDatabase.reduce((sum, ticket) => sum + ticket.quantity, 0),
    totalAttendees: ticketDatabase.reduce((sum, ticket) => sum + ticket.attendees.length, 0),
  })
}

// Función placeholder para Mercado Pago
async function createMercadoPagoPayment(purchase: TicketPurchase): Promise<string> {
  // Aquí integrarías con la API de Mercado Pago
  // Por ahora retorna una URL de ejemplo
  return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=example_${purchase.id}`
}
