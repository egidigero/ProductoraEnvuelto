import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

// Mark as dynamic since we don't have events table
export const dynamic = 'force-dynamic';

type Params = {
  id: string;
};

/**
 * GET /api/admin/events/[id]/export-csv
 * Export all tickets as CSV (event ID is ignored since we don't use events table)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Fetch all tickets (ignoring event_id since we removed it)
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        status,
        used_at,
        created_at,
        attendee_name,
        attendee_email,
        attendee_dni,
        ticket_type_name,
        order_id
      `)
      .order('created_at', { ascending: true });

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets found' },
        { status: 404 }
      );
    }

    // Fetch orders separately to get buyer info
    const orderIds = [...new Set(tickets.map(t => t.order_id).filter(Boolean))];
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_name, buyer_email, total_amount, created_at')
      .in('id', orderIds);

    // Create a map of orders by ID
    const ordersMap = new Map();
    orders?.forEach(order => {
      ordersMap.set(order.id, order);
    });

    // Build CSV content
    const headers = [
      'Ticket ID',
      'Attendee Name',
      'Attendee Email',
      'Attendee DNI',
      'Ticket Type',
      'Buyer Name',
      'Buyer Email',
      'Status',
      'Purchase Date',
      'Used At',
    ];

    const rows = tickets.map(ticket => {
      const order = ordersMap.get(ticket.order_id);
      return [
        ticket.id,
        ticket.attendee_name || '',
        ticket.attendee_email || '',
        ticket.attendee_dni || '',
        ticket.ticket_type_name || '',
        order?.buyer_name || '',
        order?.buyer_email || '',
        ticket.status,
        ticket.created_at,
        ticket.used_at || '',
      ];
    });

    // Format CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape cells containing commas or quotes
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tickets-export-${Date.now()}.csv"`,
      },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
