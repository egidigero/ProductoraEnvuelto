import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: ticketTypes } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true })

    const experiences = ticketTypes?.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: tt.final_price,
      capacity: tt.capacity,
      currentSold: tt.sold_count,
      available: tt.capacity - tt.sold_count,
      status: tt.status,
    })) || []

    return NextResponse.json({ success: true, experiences })
  } catch (error) {
    return NextResponse.json({ success: false, experiences: [] }, { status: 500 })
  }
}
