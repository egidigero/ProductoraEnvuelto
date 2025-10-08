import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client';
import type { TicketType } from '@/lib/types';

// GET /api/ticket-types - Obtener todos los tipos de ticket (sin filtro por evento)
export async function GET(request: NextRequest) {
  try {
    // Consultar tipos de ticket con disponibilidad
    const { data: ticketTypes, error } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching ticket types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ticket types' },
        { status: 500 }
      );
    }

    // Calcular campos adicionales
    const enrichedTicketTypes = (ticketTypes || []).map((tt) => ({
      ...tt,
      available: tt.capacity - tt.sold_count,
      availability_status: 
        tt.capacity - tt.sold_count <= 0 
          ? 'sold_out' 
          : tt.capacity - tt.sold_count <= 10 
          ? 'low_stock' 
          : 'available',
      sold_percentage: tt.capacity > 0 
        ? Math.round((tt.sold_count / tt.capacity) * 100) 
        : 0,
    }));

    return NextResponse.json({
      success: true,
      ticket_types: enrichedTicketTypes,
    });
  } catch (error) {
    console.error('Error in GET /api/ticket-types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/ticket-types - Crear nuevo tipo de ticket (sin event_id)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      base_price,
      service_fee = 0,
      capacity,
      status = 'active',
      is_popular = false,
      display_order = 0,
      features = [],
    } = body;

    // Validaciones
    if (!name || base_price === undefined || capacity === undefined) {
      return NextResponse.json(
        { error: 'name, base_price, and capacity are required' },
        { status: 400 }
      );
    }

    if (base_price < 0 || service_fee < 0 || capacity < 0) {
      return NextResponse.json(
        { error: 'Prices and capacity must be non-negative' },
        { status: 400 }
      );
    }

    // Crear ticket type (sin event_id)
    const { data: ticketType, error } = await supabaseAdmin
      .from('ticket_types')
      .insert({
        name,
        description,
        base_price,
        service_fee,
        capacity,
        status,
        is_popular,
        display_order,
        features,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket type:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket_type: ticketType,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/ticket-types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
