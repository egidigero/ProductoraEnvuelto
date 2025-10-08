import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/login
 * Authenticate operator for scanner access
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario y contraseña requeridos',
        },
        { status: 400 }
      )
    }

    // Find operator by username
    const { data: operator, error } = await supabaseAdmin
      .from('operators')
      .select('id, username, password_hash, name, email, is_active')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error || !operator) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario o contraseña incorrectos',
        },
        { status: 401 }
      )
    }

    // Check if operator is active
    if (!operator.is_active) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario desactivado. Contacta al administrador.',
        },
        { status: 403 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, operator.password_hash)

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: 'Usuario o contraseña incorrectos',
        },
        { status: 401 }
      )
    }

    // Update last login timestamp
    await supabaseAdmin
      .from('operators')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', operator.id)

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login exitoso',
        operator: {
          id: operator.id,
          username: operator.username,
          name: operator.name,
          email: operator.email,
        },
      },
      { status: 200 }
    )

    // Set HTTP-only cookie with operator session
    // In production, use a proper JWT or session token
    const sessionData = JSON.stringify({
      id: operator.id,
      username: operator.username,
      name: operator.name,
      loginAt: new Date().toISOString(),
    })

    response.cookies.set('operator_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
      },
      { status: 500 }
    )
  }
}
