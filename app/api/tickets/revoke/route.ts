import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

// Mark as dynamic route
export const dynamic = 'force-dynamic'

/**
 * POST /api/tickets/revoke
 * Revoke a ticket (admin action)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticket_id } = body;

    if (!ticket_id) {
      return NextResponse.json(
        { error: 'Missing ticket_id' },
        { status: 400 }
      );
    }

    // Update ticket status to revoked
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'revoked' })
      .eq('id', ticket_id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: data,
      message: 'Ticket revoked successfully',
    });

  } catch (error) {
    console.error('Error revoking ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
