import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from '@/lib/supabase-client'

export async function GET() {
  try {
    console.log("[Experiences] Fetching events from Supabase...")

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        name,
        description,
        price,
        currency,
        capacity,
        venue,
        start_at,
        status,
        created_at,
        tickets (
          id,
          status
        )
      `)
      .order('start_at', { ascending: true })

    if (eventsError) {
      console.error("[Experiences] Error fetching events:", eventsError)
      return NextResponse.json(
        { success: false, error: eventsError.message },
        { status: 500 }
      )
    }

    const experiences = (events || []).map(event => {
      const validTickets = event.tickets?.filter(t => 
        t.status === 'valid' || t.status === 'used'
      ).length || 0

      return {
        id: event.id,
        name: event.name,
        description: event.description || '',
        price: event.price,
        maxCapacity: event.capacity || 0,
        currentSold: validTickets,
        status: event.status as 'active' | 'inactive' | 'sold_out',
        eventDate: event.start_at,
        location: event.venue,
        createdAt: event.created_at
      }
    })

    console.log("[Experiences] Found experiences:", experiences.length)

    return NextResponse.json({
      success: true,
      experiences
    })
  } catch (error: any) {
    console.error("[Experiences] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[Experiences] Creating new event:", body)

    const { data: newEvent, error: insertError } = await supabaseAdmin
      .from('events')
      .insert({
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        currency: 'ARS',
        capacity: parseInt(body.maxCapacity),
        venue: body.location,
        start_at: body.eventDate,
        status: body.status || 'active'
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Experiences] Error creating event:", insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    const experience = {
      id: newEvent.id,
      name: newEvent.name,
      description: newEvent.description || '',
      price: newEvent.price,
      maxCapacity: newEvent.capacity || 0,
      currentSold: 0,
      status: newEvent.status,
      eventDate: newEvent.start_at,
      location: newEvent.venue,
      createdAt: newEvent.created_at
    }

    console.log("[Experiences] Event created:", experience.id)

    return NextResponse.json({
      success: true,
      experience
    })
  } catch (error: any) {
    console.error("[Experiences] Error creating event:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}

