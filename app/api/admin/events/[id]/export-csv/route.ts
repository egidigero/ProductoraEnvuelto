import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

type Params = {
  id: string;
};

/**
 * GET /api/admin/events/[id]/export-csv
 * Export tickets for an event as CSV
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params;

    // Fetch event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('name')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch all tickets for this event
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        status,
        used_at,
        created_at,
        order:orders!inner(
          buyer_name,
          buyer_email,
          external_reference,
          amount,
          paid_at
        )
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: true });

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    // Build CSV content
    const headers = [
      'Ticket ID',
      'Order Reference',
      'Buyer Name',
      'Buyer Email',
      'Amount',
      'Status',
      'Purchase Date',
      'Used At',
    ];

    const rows = tickets?.map(ticket => {
      const order = Array.isArray(ticket.order) ? ticket.order[0] : ticket.order;
      return [
        ticket.id,
        order?.external_reference || '',
        order?.buyer_name || '',
        order?.buyer_email || '',
        order?.amount || '0',
        ticket.status,
        ticket.created_at,
        ticket.used_at || '',
      ];
    }) || [];

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
        'Content-Disposition': `attachment; filename="tickets-${event.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv"`,
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
