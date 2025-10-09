import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Mark as dynamic route
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json({ error: "Order ID requerido" }, { status: 400 })
    }

    // Verificar que la orden existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
    }

    // Obtener todos los tickets de esta orden
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        attendee_name,
        attendee_email,
        attendee_dni,
        token,
        qr_code_url,
        status,
        created_at,
        ticket_type_id
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (ticketsError) {
      console.error('Error obteniendo tickets:', ticketsError)
      return NextResponse.json({ error: "Error al obtener tickets" }, { status: 500 })
    }

    // Obtener información de los tipos de ticket
    const ticketTypeIds = [...new Set(tickets?.map(t => t.ticket_type_id).filter(Boolean))]
    
    let ticketTypes: any[] = []
    if (ticketTypeIds.length > 0) {
      const { data: types } = await supabase
        .from('ticket_types')
        .select('id, name, final_price')
        .in('id', ticketTypeIds)
      
      ticketTypes = types || []
    }

    // Enriquecer tickets con información del tipo
    const enrichedTickets = tickets?.map(ticket => {
      const ticketType = ticketTypes.find(t => t.id === ticket.ticket_type_id)
      return {
        ...ticket,
        ticket_type_name: ticketType?.name || 'General',
        ticket_price: ticketType?.final_price || 0
      }
    })

    return NextResponse.json({
      order: {
        id: order.id,
        buyer_email: order.buyer_email,
        buyer_name: order.buyer_name,
        amount: order.amount,
        quantity: order.quantity,
        status: order.status,
        external_reference: order.external_reference,
        created_at: order.created_at
      },
      tickets: enrichedTickets || []
    })

  } catch (error: any) {
    console.error("Error obteniendo tickets:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
