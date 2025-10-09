import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';
import { hashToken, isValidToken, generateQRCodeDataURL, createTicketURL } from '@/lib/token-utils';

// Mark as dynamic route
export const dynamic = 'force-dynamic'

/**
 * GET /api/tickets/show?tkn=...
 * Show a ticket's QR code (for web viewing)
 * This is a fallback if email wasn't received
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tkn = searchParams.get('tkn');

    if (!tkn) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }

    // Validate token format
    if (!isValidToken(tkn)) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Hash the token
    const token_hash = hashToken(tkn);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        status,
        used_at,
        metadata,
        order:orders(
          buyer_name,
          buyer_email
        ),
        event:events(
          name,
          venue,
          start_at
        )
      `)
      .eq('token', token_hash)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Generate QR code data URL for display
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ticketUrl = createTicketURL(baseUrl, tkn);
    const qrDataUrl = await generateQRCodeDataURL(ticketUrl);

    return NextResponse.json({
      ticket_id: ticket.id,
      status: ticket.status,
      used_at: ticket.used_at,
      qr_code: qrDataUrl,
      event: ticket.event,
      metadata: ticket.metadata,
    });

  } catch (error) {
    console.error('Error showing ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
