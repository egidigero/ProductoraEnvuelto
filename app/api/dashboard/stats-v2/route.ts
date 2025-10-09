import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    console.log('[stats-v2] Fetching all orders and tickets');

    // 1. Obtener todas las orders (sin filtrar por evento)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders', details: ordersError },
        { status: 500 }
      );
    }

    console.log(`[stats-v2] Found ${orders?.length || 0} orders`);

    // 2. Obtener IDs de orders
    const orderIds = orders?.map(o => o.id) || [];

    // 3. Obtener todos los tickets de esas orders
    let tickets: any[] = [];
    if (orderIds.length > 0) {
      const { data: ticketsData, error: ticketsError } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .in('order_id', orderIds);

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch tickets', details: ticketsError },
          { status: 500 }
        );
      }
      tickets = ticketsData || [];
    }

    console.log(`[stats-v2] Found ${tickets.length} tickets`);

    // 4. Obtener ticket types (todos, sin filtrar por evento)
    const { data: ticketTypes, error: ttError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (ttError) {
      console.error('Error fetching ticket types:', ttError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ticket types', details: ttError },
        { status: 500 }
      );
    }

    console.log(`[stats-v2] Found ${ticketTypes?.length || 0} ticket types`);

    // 5. Calcular estadísticas
    const totalTickets = tickets.length;
    const scannedTickets = tickets.filter(t => t.status === 'used').length;
    const revokedTickets = tickets.filter(t => t.status === 'revoked').length;
    const validTickets = tickets.filter(t => t.status === 'valid').length;

    // Revenue total de orders pagadas
    const paidOrders = orders?.filter(o => o.status === 'paid') || [];
    const revenue = paidOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    // Total de ventas (orders completadas)
    const totalSales = paidOrders.length;

    // 6. Calcular datos por tipo de ticket
    const ticketTypeStats = ticketTypes?.map(tt => {
      const ttTickets = tickets.filter(t => t.ticket_type_id === tt.id);
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

    // 7. Construir purchases agrupando tickets por order
    const orderMap = new Map();
    
    // Primero agregar todas las orders
    orders?.forEach(order => {
      orderMap.set(order.id, {
        id: order.id,
        buyerName: order.buyer_name || 'N/A',
        buyerEmail: order.buyer_email || 'N/A',
        buyerPhone: order.buyer_phone || 'N/A',
        buyerDni: order.buyer_dni || 'N/A',
        totalAmount: order.total_amount || 0,
        status: order.status || 'pending',
        createdAt: order.created_at,
        mercadoPagoId: order.mercadopago_payment_id || '',
        attendees: [],
      });
    });

    // Luego agregar los tickets a cada order
    tickets.forEach(ticket => {
      const order = orderMap.get(ticket.order_id);
      if (order) {
        // Buscar el nombre del ticket type
        const ticketType = ticketTypes?.find(tt => tt.id === ticket.ticket_type_id);
        
        order.attendees.push({
          id: ticket.id,
          name: ticket.attendee_name || '',
          lastName: '',
          dni: ticket.attendee_dni || '',
          email: ticket.attendee_email || '',
          ticketType: ticketType?.name || 'General',
          qrToken: ticket.token || '',
          scannedAt: ticket.used_at,
          isRevoked: ticket.status === 'revoked',
        });
      }
    });

    const purchases = Array.from(orderMap.values());

    console.log('[stats-v2] Stats calculated:', { totalSales, totalTickets, scannedTickets, revenue });

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
