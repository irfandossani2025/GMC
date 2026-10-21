import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { currentUser } from '@/lib/security/user-access';
import { positivePage, addValidityMonths } from '@/lib/clinic-dates';
import { createMemberSchema } from '@/lib/validators';
import { createOrGetActiveMembershipCard } from '@/lib/cards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if(!actor) return NextResponse.json({error: 'Unauthorized'}, {status:401});
    if(!['ADMIN','SUPER_ADMIN','MANAGER'].includes(actor.role)) return NextResponse.json({error:'Forbidden'},{status:403});
    const { searchParams } = new URL(request.url);
    const page = positivePage(searchParams.get('page'),1);
    const limit = positivePage(searchParams.get('limit'),10,100);
    const search = (searchParams.get('search') || '').trim().slice(0,200);
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { memberId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      if(!['ACTIVE','INACTIVE','SUSPENDED','EXPIRED'].includes(status)) return NextResponse.json({error:'Invalid membership status'},{status:400});
      where.status = status;
    }

    const [members, total] = await Promise.all([
      db.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          memberId: true,
          name: true,
          phone: true,
          email: true,
          membershipType: true,
          status: true,
          expiryDate: true,
          cardIssued: true,
          createdAt: true,
        },
      }),
      db.member.count({ where }),
    ]);

    return NextResponse.json({
      data: members,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if(!actor) return NextResponse.json({error:'Unauthorized'},{status:401});
    if(!['ADMIN','SUPER_ADMIN','MANAGER'].includes(actor.role)) return NextResponse.json({error:'Forbidden'},{status:403});
    const body = await request.json();
    const data = createMemberSchema.parse(body);

    const userId = actor.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { generateMemberId, generateTransactionId } = await import('@/lib/auth');
    const memberId = data.patientId || generateMemberId();

    const { member, card } = await db.$transaction(async (tx) => {
      const initialPackage = data.packageId ? await tx.treatmentPackage.findUnique({where:{id:data.packageId},include:{treatment:true}}) : null;
      if(data.packageId && (!initialPackage || !initialPackage.active || !initialPackage.treatment.active)) throw new Error('The selected treatment package is no longer available.');
      const member = await tx.member.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          bloodGroup: data.bloodGroup,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          membershipType: data.membershipType,
          expiryDate: data.expiryDate,
          memberId,
          createdByUser: {
            connect: { id: userId },
          },
        },
      });

      const { card } = await createOrGetActiveMembershipCard(tx, member);
      if(initialPackage) {
        await tx.memberPackage.create({data:{memberId:member.id,packageId:initialPackage.id,purchasedAt:new Date(),expiryDate:addValidityMonths(new Date(),initialPackage.validityMonths),totalSessions:initialPackage.sessionCount,usedSessions:0,remainingSessions:initialPackage.sessionCount,status:'ACTIVE'}});
        await tx.transaction.create({data:{transactionId:generateTransactionId(),memberId:member.id,amount:initialPackage.price,type:'MEMBERSHIP_FEE',status:'COMPLETED',description:`Purchased ${initialPackage.name} package`}});
      }
      return { member, card };
    });

    return NextResponse.json({ ...member, card }, { status: 201 });
  } catch (error) {
    if(error instanceof z.ZodError) return NextResponse.json({error:error.errors[0]?.message || 'Check the patient details.'},{status:400});
    if((error as {code?:string}).code==='P2002') return NextResponse.json({error:'A patient with this phone number or patient ID already exists.'},{status:409});
    if(error instanceof Error && error.message==='The selected treatment package is no longer available.') return NextResponse.json({error:error.message},{status:409});
    console.error('Create member error');
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 400 }
    );
  }
}
