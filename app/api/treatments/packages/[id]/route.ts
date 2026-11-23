import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createTreatmentPackageSchema } from '@/lib/validators';
import { currentUser, isAdministrator } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await currentUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdministrator(actor.role)) return NextResponse.json({ error: 'Only administrators can edit treatment packages' }, { status: 403 });

    const data = createTreatmentPackageSchema.parse(await request.json());
    const existing = await db.treatmentPackage.findUnique({ where: { id: params.id }, include: { treatment: true } });
    if (!existing || !existing.active) return NextResponse.json({ error: 'Treatment package not found' }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      const treatment = await tx.treatment.update({
        where: { id: existing.treatmentId },
        data: {
          name: data.treatmentName.trim(),
          category: data.category.trim(),
          durationMinutes: Math.round(data.durationMinutes),
          price: data.treatmentPrice,
        },
      });
      const treatmentPackage = await tx.treatmentPackage.update({
        where: { id: existing.id },
        data: {
          name: data.packageName.trim(),
          description: data.description ?? null,
          sessionCount: Math.round(data.sessionCount),
          price: data.packagePrice,
          validityMonths: Math.round(data.validityMonths),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'TreatmentPackage',
          entityId: existing.id,
          userId: actor.id,
          changes: JSON.stringify({
            before: {
              treatmentName: existing.treatment.name, category: existing.treatment.category,
              durationMinutes: existing.treatment.durationMinutes, treatmentPrice: existing.treatment.price,
              packageName: existing.name, description: existing.description, sessionCount: existing.sessionCount,
              packagePrice: existing.price, validityMonths: existing.validityMonths,
            },
            after: data,
          }),
        },
      });
      return { treatment, package: treatmentPackage };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message || 'Invalid data' }, { status: 400 });
    console.error('Treatment package update error:', error);
    return NextResponse.json({ error: 'Failed to update treatment package' }, { status: 500 });
  }
}
