'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getJson, postJson, patchJson, deleteJson } from '@/lib/api-client';

interface StaffUser {
	  id: string;
	  name: string;
	  email: string;
	  role: 'ADMIN' | 'STAFF';
	  active: boolean;
	  createdAt: string;
	  _count: { sessions: number };
}

interface UsersResponse {
	  users: StaffUser[];
}

const ROLE_LABELS = { ADMIN: 'Admin', STAFF: 'Staff' };
const ROLE_COLORS = {
	  ADMIN: 'bg-purple-100 text-purple-800',
	  STAFF: 'bg-blue-100 text-blue-800',
};

function formatDate(dateStr: string): string {
	  return new Date(dateStr).toLocaleDateString('en-GB', {
		      day: '2-digit', month: 'short', year: 'numeric',
	  });
}

export default function UsersPage() {
	  const [users, setUsers] = useState<StaffUser[]>([]);
	  const [loading, setLoading] = useState(true);
	  const [error, setError] = useState('');
	  const [successMsg, setSuccessMsg] = useState('');
	  const [showAddForm, setShowAddForm] = useState(false);
	  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
	  const [formData, setFormData] = useState({
		      name: '', email: '', password: '', role: 'STAFF' as 'ADMIN' | 'STAFF',
	  });
	  const [formError, setFormError] = useState('');
	  const [submitting, setSubmitting] = useState(false);
	
	  const fetchUsers = useCallback(async () => {
		      setLoading(true);
		      setError('');
		      try {
				        const data = await getJson<UsersResponse>('/api/users');
				        setUsers(data.users || []);
			  } catch (err: any) {
				        setError(err.message || 'Failed to load staff users');
			  } finally {
				        setLoading(false);
			  }
	  }, []);
	
	  useEffect(() => { fetchUsers(); }, [fetchUsers]);
	
	  const showSuccess = (msg: string) => {
		      setSuccessMsg(msg);
		      setTimeout(() => setSuccessMsg(''), 4000);
	  };
	
	  const resetForm = () => {
		      setFormData({ name: '', email: '', password: '', role: 'STAFF' });
		      setFormError('');
		      setShowAddForm(false);
		      setEditingUser(null);
	  };
	
	  const handleSubmit = async (e: React.FormEvent) => {
		      e.preventDefault();
		      setFormError('');
		      setSubmitting(true);
		      try {
				        if (editingUser) {
							        const updateData: any = {
										          name: formData.name,
										          email: formData.email,
										          role: formData.role,
									};
							        if (formData.password) updateData.password = formData.password;
							        await patchJson(`/api/users/${editingUser.id}`, updateData);
							        showSuccess('Staff member updated successfully');
						} else {
							        await postJson('/api/users', formData);
							        showSuccess('Staff member added successfully');
						}
				        await fetchUsers();
				        resetForm();
			  } catch (err: any) {
				        setFormError(err.message || 'Failed to save user');
			  } finally {
				        setSubmitting(false);
			  }
	  };
	
	  const handleToggleActive = async (user: StaffUser) => {
		      try {
				        await patchJson(`/api/users/${user.id}`, { active: !user.active });
				        showSuccess(`User ${user.active ? 'deactivated' : 'activated'} successfully`);
				        await fetchUsers();
			  } catch (err: any) {
				        setError(err.message || 'Failed to update user');
			  }
	  };
	
	  const openEditForm = (user: StaffUser) => {
		      setEditingUser(user);
		      setFormData({ name: user.name, email: user.email, password: '', role: user.role });
		      setShowAddForm(true);
		      setFormError('');
	  };
	
	  return (
		      <div className="space-y-6">
			        <div className="flex items-center justify-between">
						        <div>
									<h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
									          <p className="text-sm text-gray-500 mt-1">Manage clinic staff accounts and access levels</p>
						</div>
						{!showAddForm && (
							          <Button onClick={() => { setShowAddForm(true); setEditingUser(null); resetForm(); setShowAddForm(true); }}>
								            + Add Staff Member
								          </Button>
							        )}
			  </div>
			  
			  {successMsg && (
				          <div className="bg-green-50 border border-green-200 rounded-md p-4">
					  <p className="text-green-800 text-sm font-medium">{successMsg}</p>
					          </div>
				        )}
			  {error && (
				          <div className="bg-red-50 border border-red-200 rounded-md p-4">
					  <p className="text-red-800 text-sm">{error}</p>
					          </div>
				        )}
			  
			  {/* Add/Edit Form */}
			  {showAddForm && (
				          <Card>
					            <CardHeader>
									            <CardTitle>{editingUser ? `Edit ${editingUser.name}` : 'Add New Staff Member'}</CardTitle>
					  </CardHeader>
					            <CardContent>
									            <form onSubmit={handleSubmit} className="space-y-4">
													{formError && (
														                <div className="bg-red-50 border border-red-200 rounded-md p-3">
															<p className="text-red-800 text-sm">{formError}</p>
															                </div>
														              )}
													              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	                  <div>
																						                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
																						                    <Input
																												                    value={formData.name}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
																												                    placeholder="e.g. Sarah Johnson"
																												                    required
																												                  />
																	  </div>
																	                  <div>
																						                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
																						                    <Input
																												                    type="email"
																												                    value={formData.email}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
																												                    placeholder="sarah@clinic.com"
																												                    required
																												                  />
																	  </div>
																	                  <div>
																						                    <label className="block text-sm font-medium text-gray-700 mb-1">
																												                    Password {editingUser ? '(leave blank to keep current)' : '*'}
																						  </label>
																						                    <Input
																												                    type="password"
																												                    value={formData.password}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
																												                    placeholder="Min. 8 characters"
																												                    required={!editingUser}
																												                  />
																	  </div>
																	                  <div>
																						                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
																						                    <select
																												                    value={formData.role}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'STAFF' }))}
																												                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																												                    required
																												                  >
																												<option value="STAFF">Staff</option>
																												<option value="ADMIN">Admin</option>
																						  </select>
																	  </div>
													</div>
													              <div className="flex gap-3 pt-2">
																	                  <Button type="submit" disabled={submitting}>
																						  {submitting ? 'Saving...' : (editingUser ? 'Save Changes' : 'Add Staff Member')}
																	  </Button>
																	                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
													</div>
									</form>
					  </CardContent>
					          </Card>
				        )}
			  
			  {/* Users Table */}
			        <Card>
						        <CardHeader>
									          <CardTitle className="flex items-center justify-between">
												  <span>Staff Members</span>
												              <span className="text-sm font-normal text-gray-500">{users.length} member{users.length !== 1 ? 's' : ''}</span>
									</CardTitle>
						</CardHeader>
						        <CardContent>
									{loading ? (
										            <div className="flex justify-center py-12">
											              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
											            </div>
										          ) : users.length === 0 ? (
										            <div className="text-center py-12 text-gray-500">
											<p className="text-lg font-medium">No staff members yet</p>
											<p className="text-sm mt-1">Add your first staff member to get started</p>
											            </div>
										          ) : (
										            <div className="overflow-x-auto">
											              <table className="w-full text-sm">
															                  <thead>
																				                    <tr className="border-b border-gray-200">
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Name</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Email</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Role</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Sessions</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Joined</th>
																										                    <th className="text-right py-3 px-2 font-semibold text-gray-700">Actions</th>
																				  </tr>
															  </thead>
															                  <tbody>
																				  {users.map((user) => (
																					                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
																						                        <td className="py-3 px-2 font-medium text-gray-900">{user.name}</td>
																						                        <td className="py-3 px-2 text-gray-600">{user.email}</td>
																						                        <td className="py-3 px-2">
																													                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
																																				{ROLE_LABELS[user.role]}
																													</span>
																						  </td>
																						                        <td className="py-3 px-2">
																													                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
																																				{user.active ? 'Active' : 'Inactive'}
																													</span>
																						  </td>
																						                        <td className="py-3 px-2 text-gray-600">{user._count.sessions}</td>
																						                        <td className="py-3 px-2 text-gray-600">{formatDate(user.createdAt)}</td>
																						                        <td className="py-3 px-2">
																													                        <div className="flex gap-2 justify-end">
																																				                          <Button
																																										                              variant="outline"
																																																	                              size="sm"
																																																								                              onClick={() => openEditForm(user)}
																																																															                            >
																																																																						                            Edit
																																																																													                          </Button>
																																				                          <Button
																																										                              variant="outline"
																																																	                              size="sm"
																																																								                              onClick={() => handleToggleActive(user)}
																																																															                              className={user.active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
																																																																						                            >
																																																																													                            {user.active ? 'Deactivate' : 'Activate'}
																																																																																				                          </Button>
																													</div>
																						  </td>
																						                      </tr>
																					                    ))}
															  </tbody>
											</table>
											            </div>
										          )}
						</CardContent>
			  </Card>
			      </div>
		    );
}
