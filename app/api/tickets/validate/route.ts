import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { hashToken, isValidToken } from '@/lib/token-utils'

// Mark as dynamic route
export const dynamic = 'force-dynamic'

/**
 * POST /api/tickets/validate
 * Atomically validate and mark a ticket as used
 * Prevents double scanning with database-level atomicity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    // Solo log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[VALIDATE] Received token:', token ? token.substring(0, 8) + '...' : 'empty')
    }

    // Validate input
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token requerido",
        },
        { status: 400 }
      )
    }

    // Validate token format
    if (!isValidToken(token)) {
      return NextResponse.json(
        {
          success: false,
          message: "Formato de token inválido",
        },
        { status: 400 }
      )
    }

    // Hash the token
    const token_hash = hashToken(token)

    // Get client IP address
    const remote_addr =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // ATOMIC UPDATE: Try to mark ticket as used
    // This query will only succeed if the ticket is currently 'valid'
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
      })
      .eq('token', token_hash)
      .eq('status', 'valid')
      .select(
        `
        id,
        status,
        used_at,
        order_id,
        attendee_name,
        attendee_email,
        attendee_dni,
        ticket_type_id,
        ticket_types (
          name
        )
      `
      )
      .single()

    if (process.env.NODE_ENV === 'development') {
      console.log('[VALIDATE] Update result:', updatedTicket ? 'SUCCESS' : 'FAILED', updateError)
    }

    if (updatedTicket) {
      // SUCCESS: Ticket was valid and is now marked as used
      const ticketTypeName = (updatedTicket.ticket_types as any)?.name || 'General'

      // Log the validation attempt
      try {
        await supabaseAdmin.from('validations').insert({
          ticket_id: updatedTicket.id,
          outcome: 'success',
          device_id: request.headers.get('user-agent') || 'unknown',
          remote_addr: remote_addr.split(',')[0].trim(),
          validated_at: new Date().toISOString(),
        })
      } catch (logError) {
        console.error('Error logging validation:', logError)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Bienvenido/a ${updatedTicket.attendee_name || 'al evento'}`,
          ticket: {
            id: updatedTicket.id,
            attendee_name: updatedTicket.attendee_name,
            ticket_type: ticketTypeName,
            used_at: updatedTicket.used_at,
          },
        },
        { status: 200 }
      )
    }

    // FAILED: Ticket was not valid. Check the reason
    const { data: existingTicket } = await supabaseAdmin
      .from('tickets')
      .select(
        `
        id,
        status,
        used_at,
        attendee_name,
        token,
        ticket_types (
          name
        )
      `
      )
      .eq('token', token_hash)
      .single()

    console.log('[VALIDATE] Existing ticket:', existingTicket ? `Found (status: ${existingTicket.status})` : 'Not found')

    let outcome = 'invalid'
    let message = 'Entrada no encontrada'

    if (existingTicket) {
      const ticketTypeName = (existingTicket.ticket_types as any)?.name || 'General'

      switch (existingTicket.status) {
        case 'used':
          outcome = 'already_used'
          message = `Esta entrada ya fue utilizada el ${new Date(existingTicket.used_at!).toLocaleString('es-AR')}`
          break
        case 'revoked':
          outcome = 'revoked'
          message = 'Esta entrada ha sido revocada'
          break
        case 'expired':
          outcome = 'expired'
          message = 'Esta entrada ha expirado'
          break
        default:
          outcome = 'invalid'
          message = 'Esta entrada no es válida'
      }

      // Log the failed validation attempt
      try {
        await supabaseAdmin.from('validations').insert({
          ticket_id: existingTicket.id,
          outcome,
          device_id: request.headers.get('user-agent') || 'unknown',
          remote_addr: remote_addr.split(',')[0].trim(),
          validated_at: new Date().toISOString(),
        })
      } catch (logError) {
        console.error('Error logging validation:', logError)
      }

      return NextResponse.json(
        {
          success: false,
          message,
          ticket: {
            id: existingTicket.id,
            attendee_name: existingTicket.attendee_name,
            ticket_type: ticketTypeName,
            status: existingTicket.status,
            used_at: existingTicket.used_at,
          },
        },
        { status: 400 }
      )
    }

    // Ticket not found at all
    return NextResponse.json(
      {
        success: false,
        message: 'Entrada no encontrada o inválida',
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('Unexpected error during validation:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
      },
      { status: 500 }
    )
  }
}
