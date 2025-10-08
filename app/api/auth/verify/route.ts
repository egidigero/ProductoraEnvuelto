import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/verify
 * Verify if operator is logged in
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('operator_session')

    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          message: 'No hay sesión activa',
        },
        { status: 401 }
      )
    }

    try {
      const session = JSON.parse(sessionCookie.value)
      
      // Validate session data
      if (!session.id || !session.username) {
        return NextResponse.json(
          {
            success: false,
            message: 'Sesión inválida',
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          operator: {
            id: session.id,
            username: session.username,
            name: session.name,
          },
        },
        { status: 200 }
      )
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sesión corrupta',
        },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Verify session error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
      },
      { status: 500 }
    )
  }
}
