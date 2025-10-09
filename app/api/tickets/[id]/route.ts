import { type NextRequest, NextResponse } from "next/server"

// Mark as dynamic route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Aquí buscarías el ticket en tu base de datos
    // Por ahora simulamos la respuesta

    const ticketId = params.id

    // Simular búsqueda en DB
    const ticket = {
      id: ticketId,
      firstName: "Juan",
      lastName: "Pérez",
      dni: "12345678",
      email: "juan@email.com",
      ticketType: "vip",
      quantity: 2,
      totalAmount: 55000,
      paymentStatus: "completed",
      qrCode: `QR_${ticketId}`,
      eventDate: "2024-12-15T22:00:00",
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
  }
}
