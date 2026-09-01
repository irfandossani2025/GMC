'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDisplayDate } from '@/lib/clinic';
import { getJson } from '@/lib/api-client';

interface SessionStats {
	  allTime: number;
	  today: number;
	  thisWeek: number;
	  thisMonth: number;
}

interface DashboardStats {
	  totalMembers: number;
	  activeMembers: number;
	  cardsIssued: number;
	  expiringSoon: number;
	  activeMemberPackages: number;
	  sessions: SessionStats;
	  expiringMembers: Array<{
		      id: string;
		      memberId: string;
		      name: string;
		      expiryDate: string;
	  }>;
}

export default function DashboardPage() {
	  const [stats, setStats] = useState<DashboardStats>({
		      totalMembers: 0,
		      activeMembers: 0,
		      cardsIssued: 0,
		      expiringSoon: 0,
		      activeMemberPackages: 0,
		      sessions: { allTime: 0, today: 0, thisWeek: 0, thisMonth: 0 },
		      expiringMembers: [],
	  });
	  const [isLoading, setIsLoading] = useState(true);
	
	  useEffect(() => {
		      const fetchStats = async () => {
				        try {
							        const data = await getJson<DashboardStats>('/api/dashboard/stats');
							        setStats(data);
						} catch (error) {
							        console.error('Failed to fetch dashboard stats:', error);
						} finally {
							        setIsLoading(false);
						}
			  };
		  
		      fetchStats();
	  }, []);
	
	  return (
		      <div className="space-y-6">
			        <div>
						<h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
						<p className="mt-1 text-slate-500">Welcome back. Here is a summary of your clinic.</p>
			  </div>
			  
			  {/* Key stats */}
			        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Total patients</p>
												              <p className="mt-1 text-3xl font-bold text-slate-900">
																  {isLoading ? '–' : stats.totalMembers}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Active patients</p>
												              <p className="mt-1 text-3xl font-bold text-emerald-600">
																  {isLoading ? '–' : stats.activeMembers}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Sessions today</p>
												              <p className="mt-1 text-3xl font-bold text-primary">
																  {isLoading ? '–' : stats.sessions?.today ?? 0}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Expiring soon</p>
												              <p className="mt-1 text-3xl font-bold text-amber-600">
																  {isLoading ? '–' : stats.expiringSoon}
												  </p>
									</CardContent>
						</Card>
			  </div>
			  
			  {/* Secondary stats */}
			        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Cards issued</p>
												              <p className="mt-1 text-2xl font-bold text-slate-900">
																  {isLoading ? '–' : stats.cardsIssued}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Sessions this month</p>
												              <p className="mt-1 text-2xl font-bold text-slate-900">
																  {isLoading ? '–' : stats.sessions?.thisMonth ?? 0}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">Active packages</p>
												              <p className="mt-1 text-2xl font-bold text-slate-900">
																  {isLoading ? '–' : stats.activeMemberPackages ?? 0}
												  </p>
									</CardContent>
						</Card>
			  </div>
			  
			  {/* Quick actions */}
			        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						        <Link href="/dashboard/scan" className="rounded-2xl bg-primary p-4 text-center text-white hover:opacity-90 transition-opacity">
									<p className="text-lg font-semibold">Scan card</p>
									<p className="mt-1 text-sm text-primary-foreground/80">Process a session</p>
						</Link>
						        <Link href="/dashboard/members/new" className="rounded-2xl bg-slate-100 p-4 text-center text-slate-800 hover:bg-slate-200 transition-colors">
									<p className="text-lg font-semibold">New patient</p>
									<p className="mt-1 text-sm text-slate-500">Register a patient</p>
						</Link>
						        <Link href="/dashboard/sessions" className="rounded-2xl bg-slate-100 p-4 text-center text-slate-800 hover:bg-slate-200 transition-colors">
									<p className="text-lg font-semibold">Session log</p>
									<p className="mt-1 text-sm text-slate-500">View history</p>
						</Link>
						        <Link href="/dashboard/reports" className="rounded-2xl bg-slate-100 p-4 text-center text-slate-800 hover:bg-slate-200 transition-colors">
									<p className="text-lg font-semibold">Reports</p>
									<p className="mt-1 text-sm text-slate-500">View stats</p>
						</Link>
			  </div>
			  
			  {/* Upcoming expiries */}
			        <Card>
						        <CardHeader>
									<CardTitle>Upcoming expiries</CardTitle>
						</CardHeader>
						        <CardContent>
									{isLoading ? (
										            <div className="py-8 text-center text-slate-500">Loading dashboard insights...</div>
										          ) : stats.expiringMembers.length === 0 ? (
										            <div className="py-8 text-center text-slate-500">No memberships are expiring within the next 30 days.</div>
										          ) : (
										            <div className="space-y-4">
											{stats.expiringMembers.map((member) => (
												                <Link key={member.id} href={`/dashboard/members/${member.id}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 hover:bg-slate-100 transition-colors">
													                  <div>
																		                      <p className="font-semibold text-slate-900">{member.name}</p>
																		  <p className="text-sm text-slate-500">{member.memberId}</p>
													</div>
													                  <div className="text-right">
																		                      <p className="text-sm font-medium text-slate-700">Expiry date</p>
																		                      <p className="text-sm text-slate-500">{formatDisplayDate(member.expiryDate)}</p>
													</div>
													                </Link>
												              ))}
											            </div>
										          )}
						</CardContent>
			  </Card>
			      </div>
		    );
}