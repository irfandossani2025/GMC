'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getJson } from '@/lib/api-client';

interface SessionStats {
	  allTime: number;
	  today: number;
	  thisWeek: number;
	  thisMonth: number;
}

interface ReportsState {
	  totalMembers: number;
	  activeMembers: number;
	  cardsIssued: number;
	  expiringSoon: number;
	  activeMemberPackages: number;
	  sessions: SessionStats;
	  expiringMembers: Array<{
		      id: string;
		      name: string;
		      memberId: string;
		      expiryDate: string;
	  }>;
}

export default function ReportsPage() {
  const { t, formatDate: formatDisplayDate } = useLanguage();
	  const [report, setReport] = useState<ReportsState | null>(null);
	  const [isLoading, setIsLoading] = useState(true);
	
	  const [loadError,setLoadError]=useState(''), [retry,setRetry]=useState(0);
  useEffect(() => {
    setIsLoading(true);setLoadError('');
		      const fetchReport = async () => {
				        try {
							        const response = await getJson<ReportsState>('/api/dashboard/stats');
							        setReport(response);
						} catch (error) {
							        setLoadError(error instanceof Error ? error.message : 'Could not load clinic reports.');
						} finally {
							        setIsLoading(false);
						}
			  };
		  
		      fetchReport();
	  }, [retry]);
	
	  if(loadError) return <div className="space-y-6"><h1>{t('Reports')}</h1><div className="feedback-banner error" role="alert"><p>{t(loadError)}</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div></div>;
  return (
		      <div className="space-y-6">
			        <div>
						<h1 className="text-2xl font-bold text-slate-900">{t("Reports")}</h1>
						        <p className="mt-1 text-slate-500">{t("Overview of clinic activity and membership health")}</p>
			  </div>
			  
			  {/* Summary stats */}
			        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">{t("Total members")}</p>
												              <p className="mt-1 text-3xl font-bold text-slate-900">
																  {isLoading ? '–' : report?.totalMembers ?? 0}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">{t("Active members")}</p>
												              <p className="mt-1 text-3xl font-bold text-emerald-600">
																  {isLoading ? '–' : report?.activeMembers ?? 0}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">{t("Cards issued")}</p>
												              <p className="mt-1 text-3xl font-bold text-slate-900">
																  {isLoading ? '–' : report?.cardsIssued ?? 0}
												  </p>
									</CardContent>
						</Card>
						        <Card>
									          <CardContent className="pt-6">
												  <p className="text-sm font-medium text-slate-500">{t("Expiring in 30 days")}</p>
												              <p className="mt-1 text-3xl font-bold text-amber-600">
																  {isLoading ? '–' : report?.expiringSoon ?? 0}
												  </p>
									</CardContent>
						</Card>
			  </div>
			  
			  {/* Session stats */}
			        <Card>
						        <CardHeader>
									<CardTitle>{t("Session activity")}</CardTitle>
						</CardHeader>
						        <CardContent>
									{isLoading ? (
										            <div className="py-6 text-center text-slate-500">{t("Loading session data...")}</div>
										          ) : (
										            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
											              <div className="rounded-lg bg-slate-50 p-4 text-center">
															  <p className="text-sm font-medium text-slate-500">{t("Today")}</p>
															                  <p className="mt-1 text-3xl font-bold text-primary">
																				  {report?.sessions.today ?? 0}
															  </p>
															  <p className="mt-1 text-xs text-slate-400">{t("sessions")}</p>
											</div>
											              <div className="rounded-lg bg-slate-50 p-4 text-center">
															  <p className="text-sm font-medium text-slate-500">{t("This week")}</p>
															                  <p className="mt-1 text-3xl font-bold text-primary">
																				  {report?.sessions.thisWeek ?? 0}
															  </p>
															  <p className="mt-1 text-xs text-slate-400">{t("sessions")}</p>
											</div>
											              <div className="rounded-lg bg-slate-50 p-4 text-center">
															  <p className="text-sm font-medium text-slate-500">{t("This month")}</p>
															                  <p className="mt-1 text-3xl font-bold text-primary">
																				  {report?.sessions.thisMonth ?? 0}
															  </p>
															  <p className="mt-1 text-xs text-slate-400">{t("sessions")}</p>
											</div>
											              <div className="rounded-lg bg-slate-50 p-4 text-center">
															  <p className="text-sm font-medium text-slate-500">{t("All time")}</p>
															                  <p className="mt-1 text-3xl font-bold text-slate-700">
																				  {report?.sessions.allTime ?? 0}
															  </p>
															  <p className="mt-1 text-xs text-slate-400">{t("sessions")}</p>
											</div>
											            </div>
										          )}
						</CardContent>
			  </Card>
			  
			  {/* Active packages */}
			        <Card>
						        <CardHeader>
									<CardTitle>{t("Package summary")}</CardTitle>
						</CardHeader>
						        <CardContent>
									{isLoading ? (
										            <div className="py-6 text-center text-slate-500">{t("Loading...")}</div>
										          ) : (
										            <div className="flex items-center gap-6">
											              <div className="rounded-lg bg-emerald-50 p-4 text-center">
															                  <p className="text-sm font-medium text-emerald-700">{t("Active packages")}</p>
															                  <p className="mt-1 text-3xl font-bold text-emerald-700">
																				  {report?.activeMemberPackages ?? 0}
															  </p>
															                  <p className="mt-1 text-xs text-emerald-600">{t("with remaining sessions")}</p>
											</div>
											            </div>
										          )}
						</CardContent>
			  </Card>
			  
			  {/* Expiring memberships */}
			        <Card>
						        <CardHeader>
									<CardTitle>{t("Expiring memberships")}</CardTitle>
						</CardHeader>
						        <CardContent>
									{isLoading ? (
										            <div className="py-10 text-center text-slate-500">{t("Loading report data...")}</div>
										          ) : !report || report.expiringMembers.length === 0 ? (
										            <div className="py-10 text-center text-slate-500">
											              {t("No members are currently expiring within the next 30 days.")} </div>
										          ) : (
										            <div className="space-y-4">
											{report.expiringMembers.map((member) => (
												                <div key={member.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4">
													                  <div>
																		                      <p className="font-semibold text-slate-900">{member.name}</p>
																		  <p className="text-sm text-slate-500">{member.memberId}</p>
													</div>
													                  <div className="text-right">
																		  <p className="text-sm text-slate-500">{t("Expiry date")}</p>
																		                      <p className="font-semibold text-slate-900">{formatDisplayDate(member.expiryDate)}</p>
													</div>
													                </div>
												              ))}
											            </div>
										          )}
						</CardContent>
			  </Card>
			      </div>
		    );
}