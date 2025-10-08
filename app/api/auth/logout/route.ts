import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * Clear operator session
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout exitoso',
      },
      { status: 200 }
    )

    // Clear the session cookie
    response.cookies.delete('operator_session')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
      },
      { status: 500 }
    )
  }
}
