import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateMemberSchema } from '@/lib/validators';
import { recordAudit, requireSuperAdmin } from '@/lib/security/user-access';

export const dynamic = 'force-dynamic';

export async function GET(
	  request: NextRequest,
	{ params }: { params: { id: string } }
) {
	  try {
		      const member = await db.member.findUnique({
				        where: { id: params.id },
				        include: {
							        cards: {
										          orderBy: { createdAt: 'desc' },
									},
							        transactions: {
										          orderBy: { createdAt: 'desc' },
									},
							        packages: {
										          orderBy: { purchasedAt: 'desc' },
										          include: {
													              package: {
																	                include: {
																						                treatment: true,
																					},
																  },
												  },
									},
							        sessions: {
										          orderBy: { createdAt: 'desc' },
										          take: 20,
										          include: {
													              treatment: {
																	                select: { name: true },
																  },
													              memberPackage: {
																	                include: {
																						                package: {
																											                  select: { name: true },
																										},
																					},
																  },
													              processedByUser: {
																	                select: { name: true },
																  },
												  },
									},
							        createdByUser: {
										          select: { id: true, name: true, email: true },
									},
						},
			  });
		  
		      if (!member) {
				        return NextResponse.json(
							{ error: 'Member not found' },
							{ status: 404 }
							      );
			  }
		  
		      return NextResponse.json(member);
	  } catch (error) {
		      console.error('Get member error:', error);
		      return NextResponse.json(
				  { error: 'Failed to fetch member' },
				  { status: 500 }
				      );
	  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    const body = await request.json();
    const data = updateMemberSchema.parse(body);

    const before = await db.member.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const member = await db.member.update({
      where: { id: params.id },
      data,
    });

    // Keep the active card's expiry in step with the membership expiry.
    if (data.expiryDate) {
      await db.membershipCard.updateMany({
        where: { memberId: member.id, status: { in: ['ACTIVE', 'PRINTED'] } },
        data: { expiryDate: data.expiryDate },
      });
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(data)) {
      const previous = (before as Record<string, unknown>)[key];
      if (value !== undefined && String(previous) !== String(value)) changes[key] = { from: previous, to: value };
    }
    await recordAudit({ userId: access.user.id, action: 'UPDATE', entityType: 'Member', entityId: member.id, memberId: member.id, changes });

    return NextResponse.json(member);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Another patient already uses this phone number or patient ID.' }, { status: 409 });
    }
    if ((error as { name?: string }).name === 'ZodError') {
      const issue = (error as { issues?: Array<{ message?: string }> }).issues?.[0];
      return NextResponse.json({ error: issue?.message || 'Please check the patient details.' }, { status: 400 });
    }
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireSuperAdmin(request);
  if ('response' in access) return access.response;
  try {
    // Soft-delete: set status to INACTIVE to preserve session history and audit logs
    const member = await db.member.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' },
    });
    await recordAudit({ userId: access.user.id, action: 'DEACTIVATE', entityType: 'Member', entityId: member.id, memberId: member.id });

    return NextResponse.json({
      success: true,
      message: 'Member deactivated successfully',
      id: member.id,
    });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Failed to deactivate member' }, { status: 500 });
  }
}
