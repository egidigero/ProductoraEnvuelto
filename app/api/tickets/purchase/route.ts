import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateToken, hashToken, generateQRCodeDataURL, createTicketURL } from "@/lib/token-utils"
import { sendTicketEmail } from "@/lib/email-service"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buyer_email, attendees, simulate_payment } = body

    if (!buyer_email?.trim()) {
      return NextResponse.json({ error: "Email del comprador requerido" }, { status: 400 })
    }

    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ error: "Debe incluir al menos un asistente" }, { status: 400 })
    }

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i]
      if (!attendee.firstName?.trim() || !attendee.lastName?.trim() || !attendee.dni?.trim() || !attendee.ticketTypeId) {
        return NextResponse.json({ error: `Datos incompletos para el asistente ${i + 1}` }, { status: 400 })
      }
    }

    let totalAmount = 0
    const ticketTypeMap = new Map()

    for (const attendee of attendees) {
      if (!ticketTypeMap.has(attendee.ticketTypeId)) {
        const { data: ticketType } = await supabase
          .from('ticket_types')
          .select('id, name, capacity, sold_count, status, base_price, service_fee, final_price')
          .eq('id', attendee.ticketTypeId)
          .single()

        if (!ticketType) {
          return NextResponse.json({ error: `Tipo de ticket no encontrado: ${attendee.ticketTypeId}` }, { status: 404 })
        }

        if (ticketType.status !== 'active') {
          return NextResponse.json({ error: `El ticket ${ticketType.name} no está disponible` }, { status: 400 })
        }

        ticketTypeMap.set(attendee.ticketTypeId, ticketType)
      }

      const ticketType = ticketTypeMap.get(attendee.ticketTypeId)
      totalAmount += ticketType.final_price
    }

    for (const [ticketTypeId, ticketType] of ticketTypeMap) {
      const requestedCount = attendees.filter((a: any) => a.ticketTypeId === ticketTypeId).length
      const available = ticketType.capacity - ticketType.sold_count
      
      if (available < requestedCount) {
        return NextResponse.json({ error: `No hay suficiente stock para ${ticketType.name}. Disponibles: ${available}, Solicitados: ${requestedCount}` }, { status: 400 })
      }
    }

    // Create order first
    const orderReference = `ORDER-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const orderStatus = simulate_payment ? 'paid' : 'pending'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_email: buyer_email,
        buyer_name: `${attendees[0].firstName} ${attendees[0].lastName}`,
        amount: totalAmount,
        quantity: attendees.length,
        status: orderStatus,
        external_reference: orderReference,
        paid_at: simulate_payment ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creando orden:', orderError)
      return NextResponse.json({ error: "Error al crear la orden", details: orderError }, { status: 500 })
    }

    // Now create tickets for each attendee linked to the order
    const ticketsToCreate: any[] = []
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    for (const attendee of attendees) {
      const token = generateToken()
      const tokenHash = hashToken(token)
      
      // Generate actual QR code image with ticket URL
      const ticketUrl = createTicketURL(baseUrl, token)
      const qrCodeDataUrl = await generateQRCodeDataURL(ticketUrl)

      ticketsToCreate.push({
        order_id: order.id,
        ticket_type_id: attendee.ticketTypeId,
        attendee_name: `${attendee.firstName} ${attendee.lastName}`,
        attendee_email: buyer_email,
        attendee_dni: attendee.dni,
        token: tokenHash,
        status: orderStatus === 'paid' ? 'valid' : 'pending',
        qr_code_url: qrCodeDataUrl
      })
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsToCreate)
      .select()

    if (ticketsError || !tickets) {
      console.error('Error creando tickets:', ticketsError)
      // Rollback: delete the order if ticket creation fails
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: "Error al generar los tickets", details: ticketsError }, { status: 500 })
    }

    // Send email with QR codes if payment is confirmed
    if (orderStatus === 'paid') {
      try {
        const emailTickets = tickets.map((ticket: any) => ({
          attendee_name: ticket.attendee_name,
          ticket_type_name: ticketTypeMap.get(ticket.ticket_type_id)?.name || 'General',
          qr_code_url: ticket.qr_code_url
        }))

        await sendTicketEmail(buyer_email, emailTickets, orderReference)
        console.log('Email de tickets enviado a:', buyer_email)
      } catch (emailError) {
        console.error('Error enviando email (no afecta la compra):', emailError)
        // No fallar la compra si el email falla
      }
    }

    if (simulate_payment) {
      return NextResponse.json({
        success: true,
        order_id: order.id,
        order_reference: orderReference,
        tickets_created: tickets.length,
        total_amount: totalAmount,
        simulation: true,
        tickets: tickets
      })
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_reference: orderReference,
      tickets_created: tickets.length,
      total_amount: totalAmount,
      tickets: tickets
    })

  } catch (error: any) {
    console.error("Error processing purchase:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}
