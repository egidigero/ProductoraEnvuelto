import { type NextRequest, NextResponse } from "next/server"

// Mock data for experiences
const mockExperiences = [
  {
    id: "exp-1",
    name: "VIP Experience",
    description: "Acceso VIP con barra libre, área exclusiva y meet & greet con los artistas",
    price: 25000,
    maxCapacity: 50,
    currentSold: 12,
    status: "active" as const,
    eventDate: "2024-12-31T22:00:00Z",
    location: "El Club De Los Pescadores",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "exp-2",
    name: "General Access",
    description: "Entrada general al evento con acceso a todas las áreas públicas",
    price: 15000,
    maxCapacity: 200,
    currentSold: 87,
    status: "active" as const,
    eventDate: "2024-12-31T22:00:00Z",
    location: "El Club De Los Pescadores",
    createdAt: "2024-01-15T10:00:00Z",
  },
]

export async function GET() {
  try {
    console.log("[v0] Fetching experiences...")

    return NextResponse.json({
      success: true,
      experiences: mockExperiences,
    })
  } catch (error) {
    console.error("[v0] Error fetching experiences:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Creating experience:", body)

    const newExperience = {
      id: `exp-${Date.now()}`,
      ...body,
      currentSold: 0,
      createdAt: new Date().toISOString(),
    }

    mockExperiences.push(newExperience)

    return NextResponse.json({
      success: true,
      experience: newExperience,
    })
  } catch (error) {
    console.error("[v0] Error creating experience:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
