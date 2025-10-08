import { type NextRequest, NextResponse } from "next/server"

// This would be imported from the main experiences route in a real app
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const experienceId = params.id

    console.log("[v0] Updating experience:", experienceId, body)

    const experienceIndex = mockExperiences.findIndex((exp) => exp.id === experienceId)

    if (experienceIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiencia no encontrada",
        },
        { status: 404 },
      )
    }

    mockExperiences[experienceIndex] = {
      ...mockExperiences[experienceIndex],
      ...body,
    }

    return NextResponse.json({
      success: true,
      experience: mockExperiences[experienceIndex],
    })
  } catch (error) {
    console.error("[v0] Error updating experience:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const experienceId = params.id

    console.log("[v0] Deleting experience:", experienceId)

    const experienceIndex = mockExperiences.findIndex((exp) => exp.id === experienceId)

    if (experienceIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiencia no encontrada",
        },
        { status: 404 },
      )
    }

    mockExperiences.splice(experienceIndex, 1)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error deleting experience:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
