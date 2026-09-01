'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getJson } from '@/lib/api-client';

interface SessionRecord {
	  id: string;
	  sessionNumber: number;
	  status: string;
	  completedAt: string | null;
	  notes: string | null;
	  member: {
		      id: string;
		      memberId: string;
		      name: string;
		      phone: string;
	  } | null;
	  treatment: {
		      id: string;
		      name: string;
		      category: string;
	  } | null;
	  memberPackage: {
		      id: string;
		      package: { id: string; name: string } | null;
	  } | null;
	  processedByUser: {
		      id: string;
		      name: string;
	  } | null;
}

interface Pagination {
	  page: number;
	  limit: number;
	  total: number;
	  totalPages: number;
}

interface SessionsResponse {
	  sessions: SessionRecord[];
	  pagination: Pagination;
}

const STATUS_LABELS: Record<string, string> = {
	  COMPLETED: 'Completed',
	  CANCELLED: 'Cancelled',
	  NO_SHOW: 'No Show',
	  IN_PROGRESS: 'In Progress',
};

const STATUS_COLORS: Record<string, string> = {
	  COMPLETED: 'bg-green-100 text-green-800',
	  CANCELLED: 'bg-red-100 text-red-800',
	  NO_SHOW: 'bg-yellow-100 text-yellow-800',
	  IN_PROGRESS: 'bg-blue-100 text-blue-800',
};

function formatDateTime(dateStr: string | null): string {
	  if (!dateStr) return '—';
	  const d = new Date(dateStr);
	  return d.toLocaleString('en-GB', {
		      day: '2-digit', month: 'short', year: 'numeric',
		      hour: '2-digit', minute: '2-digit',
	  });
}

export default function SessionHistoryPage() {
	  const [sessions, setSessions] = useState<SessionRecord[]>([]);
	  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
	  const [loading, setLoading] = useState(true);
	  const [error, setError] = useState('');
	  const [statusFilter, setStatusFilter] = useState('');
	  const [fromDate, setFromDate] = useState('');
	  const [toDate, setToDate] = useState('');
	  const [currentPage, setCurrentPage] = useState(1);
	
	  const fetchSessions = useCallback(async (page = 1) => {
		      setLoading(true);
		      setError('');
		      try {
				        const params = new URLSearchParams({ page: String(page), limit: '50' });
				        if (statusFilter) params.set('status', statusFilter);
				        if (fromDate) params.set('from', fromDate);
				        if (toDate) params.set('to', toDate);
				  
				        const data = await getJson<SessionsResponse>(`/api/sessions/history?${params}`);
				        setSessions(data.sessions || []);
				        setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
				        setCurrentPage(page);
			  } catch (err: any) {
				        setError(err.message || 'Failed to load session history');
			  } finally {
				        setLoading(false);
			  }
	  }, [statusFilter, fromDate, toDate]);
	
	  useEffect(() => {
		      fetchSessions(1);
	  }, []);
	
	  const handleSearch = () => {
		      fetchSessions(1);
	  };
	
	  const handleClear = () => {
		      setStatusFilter('');
		      setFromDate('');
		      setToDate('');
		      setTimeout(() => fetchSessions(1), 0);
	  };
	
	  return (
		      <div className="space-y-6">
			        <div>
						<h1 className="text-2xl font-bold text-gray-900">Session History</h1>
						        <p className="text-sm text-gray-500 mt-1">Complete log of all processed treatment sessions</p>
			  </div>
			  
			  {/* Filters */}
			        <Card>
						        <CardContent className="pt-4">
									          <div className="flex flex-wrap gap-3 items-end">
												              <div>
																                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
																                <select
																					                value={statusFilter}
																					                onChange={(e) => setStatusFilter(e.target.value)}
																					                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																					              >
																					<option value="">All Statuses</option>
																					<option value="COMPLETED">Completed</option>
																					<option value="CANCELLED">Cancelled</option>
																					<option value="NO_SHOW">No Show</option>
																					<option value="IN_PROGRESS">In Progress</option>
																  </select>
												  </div>
												              <div>
																                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
																                <input
																					                type="date"
																					                value={fromDate}
																					                onChange={(e) => setFromDate(e.target.value)}
																					                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																					              />
												  </div>
												              <div>
																                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
																                <input
																					                type="date"
																					                value={toDate}
																					                onChange={(e) => setToDate(e.target.value)}
																					                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																					              />
												  </div>
												              <div className="flex gap-2">
																  <Button onClick={handleSearch} size="sm">Search</Button>
																                <Button onClick={handleClear} variant="outline" size="sm">Clear</Button>
												  </div>
									</div>
						</CardContent>
			  </Card>
			  
			  {/* Results */}
			        <Card>
						        <CardHeader>
									          <CardTitle className="flex items-center justify-between">
												  <span>Sessions</span>
												              <span className="text-sm font-normal text-gray-500">
																  {pagination.total} total record{pagination.total !== 1 ? 's' : ''}
												  </span>
									</CardTitle>
						</CardHeader>
						        <CardContent>
									{error && (
										            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
											<p className="text-red-800 text-sm">{error}</p>
											            </div>
										          )}
									
									{loading ? (
										            <div className="flex justify-center py-12">
											              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
											            </div>
										          ) : sessions.length === 0 ? (
										            <div className="text-center py-12 text-gray-500">
											<p className="text-lg font-medium">No sessions found</p>
											<p className="text-sm mt-1">Try adjusting your filters</p>
											            </div>
										          ) : (
										            <>
											              <div className="overflow-x-auto">
															                  <table className="w-full text-sm">
																				                    <thead>
																										                    <tr className="border-b border-gray-200">
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Date & Time</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Patient</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Treatment</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Package</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Session #</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
																																                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Processed By</th>
																										</tr>
																				  </thead>
																				                    <tbody>
																										{sessions.map((session) => (
																											                      <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
																												                        <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
																																			{formatDateTime(session.completedAt)}
																												</td>
																												                        <td className="py-3 px-2">
																																			{session.member ? (
																																				                            <div>
																																					                              <p className="font-medium text-gray-900">{session.member.name}</p>
																																					                              <p className="text-xs text-gray-500">{session.member.memberId}</p>
																																					                            </div>
																																				                          ) : (
																																				                            <span className="text-gray-400">—</span>
																																				                          )}
																												</td>
																												                        <td className="py-3 px-2">
																																			{session.treatment ? (
																																				                            <div>
																																					                              <p className="text-gray-900">{session.treatment.name}</p>
																																					                              <p className="text-xs text-gray-500">{session.treatment.category}</p>
																																					                            </div>
																																				                          ) : (
																																				                            <span className="text-gray-400">—</span>
																																				                          )}
																												</td>
																												                        <td className="py-3 px-2 text-gray-700">
																																			{session.memberPackage?.package?.name || '—'}
																												</td>
																												                        <td className="py-3 px-2 text-center text-gray-700 font-medium">
																																			                          #{session.sessionNumber}
																												</td>
																												                        <td className="py-3 px-2">
																																			                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[session.status] || 'bg-gray-100 text-gray-800'}`}>
																																									                              {STATUS_LABELS[session.status] || session.status}
																																			</span>
																												</td>
																												                        <td className="py-3 px-2 text-gray-600">
																																			{session.processedByUser?.name || '—'}
																												</td>
																												                      </tr>
																											                    ))}
																				  </tbody>
															  </table>
											</div>
											
											{/* Pagination */}
											{pagination.totalPages > 1 && (
												                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
													                  <p className="text-sm text-gray-500">
																		                      Page {pagination.page} of {pagination.totalPages}
													</p>
													                  <div className="flex gap-2">
																		                      <Button
																								                        variant="outline"
																								                        size="sm"
																								                        onClick={() => fetchSessions(currentPage - 1)}
																								                        disabled={currentPage <= 1}
																								                      >
																								                        Previous
																		  </Button>
																		                      <Button
																								                        variant="outline"
																								                        size="sm"
																								                        onClick={() => fetchSessions(currentPage + 1)}
																								                        disabled={currentPage >= pagination.totalPages}
																								                      >
																								                        Next
																		  </Button>
													</div>
													                </div>
												              )}
											            </>
										          )}
						</CardContent>
			  </Card>
			      </div>
		    );
}
