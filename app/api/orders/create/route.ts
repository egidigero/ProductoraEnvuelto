import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';
import { generateToken, hashToken, generateQRCode, createTicketURL } from '@/lib/token-utils';
import { sendTicketEmail } from '@/lib/email-service';
import type { CreateOrderRequest } from '@/lib/types';

// Mark as dynamic route
export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/create
 * Create a new order and generate tickets with QR codes
 * For testing: simulates immediate payment approval
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    const { ticket_type_id, buyer_email, buyer_name, quantity } = body;

    // Validate required fields (sin event_id)
    if (!ticket_type_id || !buyer_email || !buyer_name || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: ticket_type_id, buyer_email, buyer_name, quantity' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || quantity > 20) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Fetch ticket type details (sin filtro por event_id)
    const { data: ticketType, error: ticketTypeError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .eq('id', ticket_type_id)
      .single();

    if (ticketTypeError || !ticketType) {
      return NextResponse.json(
        { error: 'Ticket type not found for this event' },
        { status: 404 }
      );
    }

    if (ticketType.status === 'inactive') {
      return NextResponse.json(
        { error: 'This ticket type is not available' },
        { status: 400 }
      );
    }

    if (ticketType.status === 'sold_out') {
      return NextResponse.json(
        { error: 'This ticket type is sold out' },
        { status: 400 }
      );
    }

    // Check ticket type capacity
    const available = ticketType.capacity - ticketType.sold_count;
    if (available < quantity) {
      return NextResponse.json(
        { 
          error: `Only ${available} ticket(s) available for ${ticketType.name}`,
          available,
        },
        { status: 400 }
      );
    }

    // Calculate amount using ticket type price
    const amount = ticketType.final_price * quantity;
    const currency = 'ARS';

    // Generate external reference (unique order ID)
    const external_reference = `ORD-${Date.now()}-${crypto.randomUUID().split('-')[0]}`;

    // Create order (sin event_id, ya que trabajamos con un solo evento)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        buyer_email,
        buyer_name,
        amount,
        currency,
        quantity,
        status: 'pending',
        external_reference,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // MOCK PAYMENT: Simulate immediate approval for testing
    // In production, this would be triggered by Mercado Pago webhook
    
    // Create payment record
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        status: 'approved',
        payload: {
          mock: true,
          approved_at: new Date().toISOString(),
          method: 'mock_payment',
        },
      });

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
    }

    // Update order to paid
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
    }

    // Generate tickets with QR codes
    const tickets = [];
    const qrAttachments = [];
    const ticketTokens = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (let i = 0; i < quantity; i++) {
      // Generate token and hash
      const token = generateToken();
      const token_hash = hashToken(token);
      
      ticketTokens.push(token);

      // Create ticket record (sin event_id)
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .insert({
          order_id: order.id,
          ticket_type_id,
          token: token_hash,
          status: 'valid',
          metadata: {
            ticket_number: i + 1,
            total_tickets: quantity,
            ticket_type: ticketType.name,
            price: ticketType.final_price,
          },
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        continue;
      }

      tickets.push(ticket);

      // Generate QR code
      try {
        const ticketUrl = createTicketURL(baseUrl, token);
        const qrBuffer = await generateQRCode(ticketUrl);
        const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        
        qrAttachments.push({
          filename: `ticket-${i + 1}-${order.external_reference}.png`,
          content: qrBuffer,
        });

        // Store ticket data for email
        tickets.push({
          ...ticket,
          qr_code_url: qrDataUrl,
        });
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
      }
    }

    // Prepare tickets for email
    const emailTickets = tickets.map((ticket, index) => ({
      attendee_name: buyer_name, // En este endpoint no hay nombres individuales
      ticket_type_name: ticketType.name,
      qr_code_url: ticket.qr_code_url || '',
    }));

    // Send email with tickets
    try {
      await sendTicketEmail(
        buyer_email,
        emailTickets,
        order.external_reference
      );
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the order if email fails
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      external_reference: order.external_reference,
      amount,
      currency,
      status: 'paid',
      ticket_type: ticketType.name,
      tickets_generated: tickets.length,
      message: 'Order created and tickets sent to email',
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
