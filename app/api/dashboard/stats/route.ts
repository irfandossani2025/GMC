import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
	  try {
		      const now = new Date();
		      const next30Days = new Date();
		      next30Days.setDate(next30Days.getDate() + 30);
		  
		      const startOfToday = new Date(now);
		      startOfToday.setHours(0, 0, 0, 0);
		  
		      const startOfWeek = new Date(now);
		      startOfWeek.setDate(now.getDate() - now.getDay());
		      startOfWeek.setHours(0, 0, 0, 0);
		  
		      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		  
		      const [
				        totalMembers,
				        activeMembers,
				        cardsIssued,
				        expiringSoon,
				        expiringMembers,
				        totalSessionsAllTime,
				        sessionsToday,
				        sessionsThisWeek,
				        sessionsThisMonth,
				        activeMemberPackages,
				      ] = await Promise.all([
						        db.member.count(),
						        db.member.count({
									        where: { status: 'ACTIVE' },
								}),
						        db.member.count({
									        where: { cardIssued: true },
								}),
						        db.member.count({
									        where: {
												          status: 'ACTIVE',
												          expiryDate: {
															              gte: now,
															              lte: next30Days,
														  },
											},
								}),
						        db.member.findMany({
									        where: {
												          status: 'ACTIVE',
												          expiryDate: {
															              gte: now,
															              lte: next30Days,
														  },
											},
									        orderBy: { expiryDate: 'asc' },
									        take: 5,
									        select: {
												          id: true,
												          memberId: true,
												          name: true,
												          expiryDate: true,
											},
								}),
						        db.session.count({
									        where: { status: 'COMPLETED' },
								}),
						        db.session.count({
									        where: {
												          status: 'COMPLETED',
												          createdAt: { gte: startOfToday },
											},
								}),
						        db.session.count({
									        where: {
												          status: 'COMPLETED',
												          createdAt: { gte: startOfWeek },
											},
								}),
						        db.session.count({
									        where: {
												          status: 'COMPLETED',
												          createdAt: { gte: startOfMonth },
											},
								}),
						        db.memberPackage.count({
									        where: {
												          status: 'ACTIVE',
												          remainingSessions: { gt: 0 },
												          expiryDate: { gte: now },
											},
								}),
						      ]);
		  
		      return NextResponse.json({
				        totalMembers,
				        activeMembers,
				        cardsIssued,
				        expiringSoon,
				        expiringMembers,
				        sessions: {
							        allTime: totalSessionsAllTime,
							        today: sessionsToday,
							        thisWeek: sessionsThisWeek,
							        thisMonth: sessionsThisMonth,
						},
				        activeMemberPackages,
			  });
	  } catch (error) {
		      console.error('Dashboard stats error:', error);
		      return NextResponse.json(
				  { error: 'Failed to fetch dashboard stats' },
				  { status: 500 }
				      );
	  }
}