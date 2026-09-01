import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createTreatmentPackageSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const treatments = await db.treatment.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        packages: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          include: {
            treatment: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(treatments);
  } catch (error) {
    console.error('Treatments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load treatments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTreatmentPackageSchema.parse(body);

    let treatment = await db.treatment.findFirst({
      where: {
        name: data.treatmentName,
        category: data.category,
      },
    });

    if (!treatment) {
      treatment = await db.treatment.create({
        data: {
          name: data.treatmentName,
          category: data.category,
          description: data.description,
          durationMinutes: data.durationMinutes,
          price: data.treatmentPrice,
          active: true,
        },
      });
    }

    const treatmentPackage = await db.treatmentPackage.create({
      data: {
        name: data.packageName,
        description: data.description,
        treatmentId: treatment.id,
        sessionCount: data.sessionCount,
        price: data.packagePrice,
        validityMonths: data.validityMonths,
        active: true,
      },
      include: {
        treatment: true,
      },
    });

    return NextResponse.json(treatmentPackage, { status: 201 });
  } catch (error) {
    console.error('Create treatment package error:', error);
    return NextResponse.json(
      { error: 'Failed to create treatment package' },
      { status: 400 }
    );
  }
}

