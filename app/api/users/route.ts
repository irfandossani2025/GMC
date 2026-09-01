import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createUserSchema = z.object({
	  name: z.string().min(2, 'Name must be at least 2 characters'),
	  email: z.string().email('Invalid email address'),
	  password: z.string().min(8, 'Password must be at least 8 characters'),
	  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

export async function GET(request: NextRequest) {
	  try {
		      const requestingUserId = request.headers.get('x-user-id');
		      const requestingUserRole = request.headers.get('x-user-role');
		      if (!requestingUserId) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		      if (requestingUserRole !== 'ADMIN') {
				        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
			  }
		  
		      const users = await db.user.findMany({
				        select: {
							        id: true,
							        name: true,
							        email: true,
							        role: true,
							        active: true,
							        createdAt: true,
							        updatedAt: true,
							        _count: { select: { sessions: true } },
						},
				        orderBy: { createdAt: 'desc' },
			  });
		  
		      return NextResponse.json({ users });
	  } catch (error) {
		      console.error('GET /api/users error:', error);
		      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
	  }
}

export async function POST(request: NextRequest) {
	  try {
		      const requestingUserId = request.headers.get('x-user-id');
		      const requestingUserRole = request.headers.get('x-user-role');
		      if (!requestingUserId) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		      if (requestingUserRole !== 'ADMIN') {
				        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
			  }
		  
		      const body = await request.json();
		      const data = createUserSchema.parse(body);
		  
		      const existing = await db.user.findUnique({ where: { email: data.email } });
		      if (existing) {
				        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
			  }
		  
		      const hashedPassword = await bcrypt.hash(data.password, 12);
		  
		      const user = await db.user.create({
				        data: {
							        name: data.name,
							        email: data.email,
							        password: hashedPassword,
							        role: data.role,
						},
				        select: {
							        id: true,
							        name: true,
							        email: true,
							        role: true,
							        active: true,
							        createdAt: true,
						},
			  });
		  
		      return NextResponse.json({ user }, { status: 201 });
	  } catch (error: any) {
		      if (error?.name === 'ZodError') {
				        return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 });
			  }
		      console.error('POST /api/users error:', error);
		      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
	  }
}