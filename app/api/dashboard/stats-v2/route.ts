import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
    
    if (!eventId) {
      console.error('NEXT_PUBLIC_EVENT_ID not configured');
      return NextResponse.json(
        { success: false, error: 'Event ID not configured' },
        { status: 500 }
      );
    }

    console.log('[stats-v2] Fetching data for event:', eventId);

    // 1. Obtener estadísticas de ticket types para este evento
    const { data: ticketTypes, error: ttError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (ttError) {
      console.error('Error fetching ticket types:', ttError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ticket types' },
        { status: 500 }
      );
    }

    // 2. Obtener estadísticas de orders para este evento
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // 3. Obtener estadísticas de tickets para este evento (via order)
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders!inner(event_id)
      `)
      .eq('orders.event_id', eventId);

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    console.log(`[stats-v2] Found ${tickets?.length || 0} tickets for event ${eventId}`);

    // 4. Calcular estadísticas
    const totalTickets = tickets?.length || 0;
    const scannedTickets = tickets?.filter(t => t.status === 'used').length || 0;
    const revokedTickets = tickets?.filter(t => t.status === 'revoked').length || 0;
    const validTickets = tickets?.filter(t => t.status === 'valid').length || 0;

    // Revenue total de orders pagadas
    const paidOrders = orders?.filter(o => o.status === 'paid') || [];
    const revenue = paidOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    // Total de ventas (orders completadas)
    const totalSales = paidOrders.length;

    // 5. Calcular datos por tipo de ticket
    const ticketTypeStats = ticketTypes?.map(tt => {
      const ttTickets = tickets?.filter(t => t.ticket_type_id === tt.id) || [];
      const ttScanned = ttTickets.filter(t => t.status === 'used').length;
      
      return {
        id: tt.id,
        name: tt.name,
        description: tt.description,
        price: tt.final_price,
        base_price: tt.base_price,
        service_fee: tt.service_fee,
        capacity: tt.capacity,
        sold_count: tt.sold_count,
        available: tt.capacity - tt.sold_count,
        scanned: ttScanned,
        status: tt.status,
        is_popular: tt.is_popular,
        revenue: tt.sold_count * tt.final_price,
        sold_percentage: tt.capacity > 0 ? Math.round((tt.sold_count / tt.capacity) * 100) : 0,
        features: tt.features || [],
      };
    }) || [];

    // 6. Obtener compras recientes con detalles
    const { data: recentOrders, error: recentError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        tickets (
          id,
          token,
          status,
          used_at,
          attendee_name,
          attendee_email,
          attendee_dni,
          ticket_type_id,
          ticket_types (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recentError) {
      console.error('Error fetching recent orders:', recentError);
    }

    // Formatear purchases
    const purchases = (recentOrders || []).map(order => ({
      id: order.id,
      buyerName: order.buyer_name || 'N/A',
      buyerEmail: order.buyer_email || 'N/A',
      buyerPhone: order.buyer_phone || 'N/A',
      buyerDni: order.buyer_dni || 'N/A',
      totalAmount: order.total_amount || 0,
      status: order.status || 'pending',
      createdAt: order.created_at,
      mercadoPagoId: order.mercadopago_payment_id || '',
      attendees: (order.tickets || []).map((ticket: any) => ({
        id: ticket.id,
        name: ticket.attendee_name || '',
        lastName: '',
        dni: ticket.attendee_dni || '',
        email: ticket.attendee_email || '',
        ticketType: ticket.ticket_types?.name || 'General',
        qrToken: ticket.token || '',
        scannedAt: ticket.used_at,
        isRevoked: ticket.status === 'revoked',
      })),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalSales,
        totalTickets,
        scannedTickets,
        revenue,
        pendingTickets: validTickets,
        revokedTickets,
      },
      ticketTypes: ticketTypeStats,
      purchases,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
