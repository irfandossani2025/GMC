import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createUserSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const existingUsers = await db.user.count();

    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'Initial admin setup has already been completed.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createUserSchema.parse({
      ...body,
      role: 'ADMIN',
    });

    const password = await hashPassword(data.password);

    const user = await db.user.create({
      data: {
        email: data.email,
        password,
        name: data.name,
        role: 'ADMIN',
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Initial admin setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create initial admin user.' },
      { status: 400 }
    );
  }
}
