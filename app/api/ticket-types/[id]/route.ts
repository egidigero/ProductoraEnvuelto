import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';

// Mark as dynamic route
export const dynamic = 'force-dynamic'

// GET /api/ticket-types/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: ticketType, error } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticketType) {
      console.error('Error fetching ticket type:', error);
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }

    // Calcular disponibilidad
    const available = ticketType.capacity - ticketType.sold_count;
    const enriched = {
      ...ticketType,
      available,
      availability_status: 
        available <= 0 ? 'sold_out' : available <= 10 ? 'low_stock' : 'available',
      sold_percentage: ticketType.capacity > 0 
        ? Math.round((ticketType.sold_count / ticketType.capacity) * 100) 
        : 0,
    };

    return NextResponse.json({
      success: true,
      ticket_type: enriched,
    });
  } catch (error) {
    console.error('Error in GET /api/ticket-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/ticket-types/[id] - Actualizar tipo de ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Campos permitidos para actualizar
    const allowedFields = [
      'name',
      'description',
      'base_price',
      'service_fee',
      'capacity',
      'status',
      'is_popular',
      'display_order',
      'features',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validar precios si se actualizan
    if ('base_price' in updates && updates.base_price < 0) {
      return NextResponse.json(
        { error: 'base_price must be non-negative' },
        { status: 400 }
      );
    }
    if ('service_fee' in updates && updates.service_fee < 0) {
      return NextResponse.json(
        { error: 'service_fee must be non-negative' },
        { status: 400 }
      );
    }

    // Si se actualiza la capacidad, verificar que sea >= sold_count
    if ('capacity' in updates) {
      const { data: current } = await supabaseAdmin
        .from('ticket_types')
        .select('sold_count')
        .eq('id', id)
        .single();

      if (current && updates.capacity < current.sold_count) {
        return NextResponse.json(
          { error: `Capacity cannot be less than sold count (${current.sold_count})` },
          { status: 400 }
        );
      }
    }

    const { data: ticketType, error } = await supabaseAdmin
      .from('ticket_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !ticketType) {
      console.error('Error updating ticket type:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket_type: ticketType,
    });
  } catch (error) {
    console.error('Error in PATCH /api/ticket-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/ticket-types/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar si hay tickets vendidos
    const { data: ticketType } = await supabaseAdmin
      .from('ticket_types')
      .select('sold_count, name')
      .eq('id', id)
      .single();

    if (!ticketType) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }

    if (ticketType.sold_count > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete ticket type "${ticketType.name}" with ${ticketType.sold_count} tickets sold. Set status to 'inactive' instead.`,
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('ticket_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket type:', error);
      return NextResponse.json(
        { error: 'Failed to delete ticket type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket type deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/ticket-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
