import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	  try {
		      const userId = request.headers.get('x-user-id');
		      if (!userId) {
				        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			  }
		  
		      const { searchParams } = new URL(request.url);
		      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
		      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
		      const skip = (page - 1) * limit;
		      const memberId = searchParams.get('memberId') || undefined;
		      const treatmentId = searchParams.get('treatmentId') || undefined;
		      const status = searchParams.get('status') || undefined;
		      const from = searchParams.get('from');
		      const to = searchParams.get('to');
		  
		      const where: any = {};
		      if (memberId) where.memberId = memberId;
		      if (treatmentId) where.treatmentId = treatmentId;
		      if (status) where.status = status;
		      if (from || to) {
				        where.completedAt = {};
				        if (from) where.completedAt.gte = new Date(from);
				        if (to) where.completedAt.lte = new Date(to);
			  }
		  
		      const [sessions, total] = await Promise.all([
				        db.session.findMany({
							        where,
							        skip,
							        take: limit,
							        orderBy: { completedAt: 'desc' },
							        include: {
										          member: {
													              select: {
																	                id: true,
																	                memberId: true,
																	                name: true,
																	                phone: true,
																  },
												  },
										          treatment: {
													              select: {
																	                id: true,
																	                name: true,
																	                category: true,
																  },
												  },
										          memberPackage: {
													              select: {
																	                id: true,
																	                package: {
																						                select: {
																											                  id: true,
																											                  name: true,
																										},
																					},
																  },
												  },
										          processedByUser: {
													              select: {
																	                id: true,
																	                name: true,
																  },
												  },
									},
						}),
				        db.session.count({ where }),
				      ]);
		  
		      return NextResponse.json({
				        sessions,
				        pagination: {
							        page,
							        limit,
							        total,
							        totalPages: Math.ceil(total / limit),
						},
			  });
	  } catch (error) {
		      console.error('GET /api/sessions/history error:', error);
		      return NextResponse.json({ error: 'Failed to fetch session history' }, { status: 500 });
	  }
}