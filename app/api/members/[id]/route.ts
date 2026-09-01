import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateMemberSchema } from '@/lib/validators';

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
	  try {
		      const body = await request.json();
		      const data = updateMemberSchema.parse(body);
		  
		      const member = await db.member.update({
				        where: { id: params.id },
				        data,
			  });
		  
		      return NextResponse.json(member);
	  } catch (error) {
		      console.error('Update member error:', error);
		      return NextResponse.json(
				  { error: 'Failed to update member' },
				  { status: 400 }
				      );
	  }
}

export async function DELETE(
	  request: NextRequest,
	{ params }: { params: { id: string } }
) {
	  try {
		      // Soft-delete: set status to INACTIVE to preserve session history and audit logs
		      const member = await db.member.update({
				        where: { id: params.id },
				        data: { status: 'INACTIVE' },
			  });
		  
		      return NextResponse.json({
				        success: true,
				        message: 'Member deactivated successfully',
				        id: member.id,
			  });
	  } catch (error) {
		      console.error('Delete member error:', error);
		      return NextResponse.json(
				  { error: 'Failed to deactivate member' },
				  { status: 500 }
				      );
	  }
}