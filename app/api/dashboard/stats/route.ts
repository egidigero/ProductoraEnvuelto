import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Dashboard stats API called - fetching from database")

    // Get event ID from env
    const eventId = process.env.NEXT_PUBLIC_EVENT_ID!

    // Fetch all orders for this event
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error("[v0] Error fetching orders:", ordersError)
      throw ordersError
    }

    // Fetch all tickets for this event with their relationships
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders!inner(id, buyer_name, buyer_email, buyer_phone, buyer_dni, total_amount, status, created_at, mercadopago_payment_id)
      `)
      .eq('orders.event_id', eventId)

    if (ticketsError) {
      console.error("[v0] Error fetching tickets:", ticketsError)
      throw ticketsError
    }

    console.log(`[v0] Found ${orders?.length || 0} orders and ${tickets?.length || 0} tickets`)

    // Calculate statistics based on REAL data
    const stats = {
      totalSales: orders?.length || 0,
      totalTickets: tickets?.length || 0,
      scannedTickets: tickets?.filter(t => t.status === 'used').length || 0,
      revenue: orders?.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0) || 0,
      pendingTickets: tickets?.filter(t => t.status === 'valid').length || 0,
      revokedTickets: tickets?.filter(t => t.status === 'revoked').length || 0,
    }

    // Group tickets by order for the purchases structure
    const purchasesMap = new Map()

    tickets?.forEach(ticket => {
      const order = ticket.orders as any
      if (!order) return

      if (!purchasesMap.has(order.id)) {
        purchasesMap.set(order.id, {
          id: order.id,
          buyerName: order.buyer_name,
          buyerEmail: order.buyer_email,
          buyerPhone: order.buyer_phone,
          buyerDni: order.buyer_dni,
          totalAmount: Number(order.total_amount) || 0,
          status: order.status,
          createdAt: order.created_at,
          mercadoPagoId: order.mercadopago_payment_id,
          attendees: [],
        })
      }

      purchasesMap.get(order.id).attendees.push({
        id: ticket.id,
        name: ticket.attendee_name,
        lastName: ticket.attendee_last_name,
        dni: ticket.attendee_dni,
        email: ticket.attendee_email,
        ticketType: ticket.ticket_type_name,
        qrToken: ticket.token, // This is the public token
        scannedAt: ticket.used_at,
        isRevoked: ticket.status === 'revoked',
      })
    })

    const purchases = Array.from(purchasesMap.values())

    console.log("[v0] Dashboard stats calculated:", stats)

    return NextResponse.json({
      success: true,
      purchases,
      stats,
      message: "Datos cargados correctamente desde la base de datos",
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        purchases: [],
        stats: {
          totalSales: 0,
          totalTickets: 0,
          scannedTickets: 0,
          revenue: 0,
          pendingTickets: 0,
          revokedTickets: 0,
        },
      },
      { status: 500 },
    )
  }
}
