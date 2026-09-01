import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createMemberSchema } from '@/lib/validators';
import { createOrGetActiveMembershipCard } from '@/lib/cards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
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
    const body = await request.json();
    const data = createMemberSchema.parse(body);

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { generateMemberId } = await import('@/lib/auth');
    const memberId = generateMemberId();

    const { member, card } = await db.$transaction(async (tx) => {
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
      return { member, card };
    });

    return NextResponse.json({ ...member, card }, { status: 201 });
  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 400 }
    );
  }
}
