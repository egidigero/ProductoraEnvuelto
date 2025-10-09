import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

// Mark as dynamic route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tickets
 * Search and list tickets with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders(
          buyer_name,
          buyer_email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets, error, count } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    // Filter by email or name if provided (post-query filtering)
    let filteredTickets = tickets || [];
    
    if (email) {
      filteredTickets = filteredTickets.filter(t => 
        t.order?.buyer_email?.toLowerCase().includes(email.toLowerCase())
      );
    }

    if (name) {
      filteredTickets = filteredTickets.filter(t => 
        t.order?.buyer_name?.toLowerCase().includes(name.toLowerCase())
      );
    }

    return NextResponse.json({
      tickets: filteredTickets,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
