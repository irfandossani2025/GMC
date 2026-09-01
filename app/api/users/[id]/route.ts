import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
	  name: z.string().min(2).optional(),
	  email: z.string().email().optional(),
	  password: z.string().min(8).optional(),
	  role: z.enum(['ADMIN', 'STAFF']).optional(),
	  active: z.boolean().optional(),
});

export async function PATCH(
	  request: NextRequest,
	{ params }: { params: { id: string } }
) {
	  try {
		      const requestingUserId = request.headers.get('x-user-id');
		      const requestingUserRole = request.headers.get('x-user-role');
		      if (!requestingUserId) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		      if (requestingUserRole !== 'ADMIN') {
				        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
			  }
		  
		      const target = await db.user.findUnique({ where: { id: params.id } });
		      if (!target) {
				        return NextResponse.json({ error: 'User not found' }, { status: 404 });
			  }
		  
		      const body = await request.json();
		      const data = updateUserSchema.parse(body);
		  
		      const updateData: any = {};
		      if (data.name !== undefined) updateData.name = data.name;
		      if (data.email !== undefined) updateData.email = data.email;
		      if (data.role !== undefined) updateData.role = data.role;
		      if (data.active !== undefined) updateData.active = data.active;
		      if (data.password !== undefined) {
				        updateData.password = await bcrypt.hash(data.password, 12);
			  }
		  
		      const user = await db.user.update({
				        where: { id: params.id },
				        data: updateData,
				        select: {
							        id: true,
							        name: true,
							        email: true,
							        role: true,
							        active: true,
							        createdAt: true,
							        updatedAt: true,
						},
			  });
		  
		      return NextResponse.json({ user });
	  } catch (error: any) {
		      if (error?.name === 'ZodError') {
				        return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 });
			  }
		      console.error('PATCH /api/users/[id] error:', error);
		      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
	  }
}

export async function DELETE(
	  request: NextRequest,
	{ params }: { params: { id: string } }
) {
	  try {
		      const requestingUserId = request.headers.get('x-user-id');
		      const requestingUserRole = request.headers.get('x-user-role');
		      if (!requestingUserId) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		      if (requestingUserRole !== 'ADMIN') {
				        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
			  }
		  
		      // Prevent self-deletion
		      if (params.id === requestingUserId) {
				        return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
			  }
		  
		      const target = await db.user.findUnique({ where: { id: params.id } });
		      if (!target) {
				        return NextResponse.json({ error: 'User not found' }, { status: 404 });
			  }
		  
		      // Soft delete: deactivate instead of hard delete to preserve audit logs
		      const user = await db.user.update({
				        where: { id: params.id },
				        data: { active: false },
				        select: { id: true, name: true, active: true },
			  });
		  
		      return NextResponse.json({ user, message: 'User deactivated successfully' });
	  } catch (error) {
		      console.error('DELETE /api/users/[id] error:', error);
		      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
	  }
}