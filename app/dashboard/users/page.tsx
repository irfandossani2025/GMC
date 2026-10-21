'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatUiDate, Language } from '@/lib/i18n/translate';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getJson, postJson, patchJson, deleteJson } from '@/lib/api-client';

interface StaffUser {
	  id: string;
	  name: string;
	  email: string;
	  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
	  active: boolean;
	  createdAt: string;
	  _count: { sessions: number };
}

interface UsersResponse {
	  users: StaffUser[];
  currentUser: { id: string; role: string };
}

const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', STAFF: 'Staff' };
const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-amber-100 text-amber-900',
	  ADMIN: 'bg-purple-100 text-purple-800',
	  STAFF: 'bg-blue-100 text-blue-800',
};

function formatDate(dateStr: string, language: Language): string { return formatUiDate(language, dateStr); }

export default function UsersPage() {
  const { t, language } = useLanguage();
	  const [actor, setActor] = useState<{ id: string; role: string } | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
	  const [loading, setLoading] = useState(true);
	  const [error, setError] = useState('');
	  const [successMsg, setSuccessMsg] = useState('');
	  const [showAddForm, setShowAddForm] = useState(false);
	  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
	  const [formData, setFormData] = useState({
		      name: '', email: '', password: '', role: 'STAFF' as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF',
	  });
	  const [formError, setFormError] = useState('');
	  const [submitting, setSubmitting] = useState(false);
	
	  const fetchUsers = useCallback(async () => {
		      setLoading(true);
		      setError('');
		      try {
				        const data = await getJson<UsersResponse>('/api/users');
				        setUsers(data.users || []);
          setActor(data.currentUser);
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
										          ...(editingUser.role === 'SUPER_ADMIN' ? {} : { role: formData.role }),
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
									<h1 className="text-2xl font-bold text-gray-900">{t("Staff Management")}</h1>
									          <p className="text-sm text-gray-500 mt-1">{t("Manage clinic staff accounts and access levels")}</p>
						</div>
						{!showAddForm && (
							          <Button onClick={() => { setShowAddForm(true); setEditingUser(null); resetForm(); setShowAddForm(true); }}>
								            {t("+ Add Staff Member")} </Button>
							        )}
			  </div>
			  
			  {successMsg && (
				          <div className="bg-green-50 border border-green-200 rounded-md p-4">
					  <p className="text-green-800 text-sm font-medium">{t(successMsg)}</p>
					          </div>
				        )}
			  {error && (
				          <div className="bg-red-50 border border-red-200 rounded-md p-4">
					  <p className="text-red-800 text-sm">{t(error)}</p>
					          </div>
				        )}
			  
			  {/* Add/Edit Form */}
			  {showAddForm && (
				          <Card>
					            <CardHeader>
									            <CardTitle>{editingUser ? t("Edit {name}", {name: editingUser.name}) : t("Add New Staff Member")}</CardTitle>
					  </CardHeader>
					            <CardContent>
									            <form onSubmit={handleSubmit} className="space-y-4">
													{formError && (
														                <div className="bg-red-50 border border-red-200 rounded-md p-3">
															<p className="text-red-800 text-sm">{t(formError)}</p>
															                </div>
														              )}
													              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	                  <div>
																						                    <label htmlFor="field-app-dashboard-users-page-tsx-1" className="block text-sm font-medium text-gray-700 mb-1">{t("Full Name *")}</label>
																						                    <Input id="field-app-dashboard-users-page-tsx-1"
																												                    value={formData.name}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
																												                    placeholder={t("e.g. Sarah Johnson")}
																												                    required
																												                  />
																	  </div>
																	                  <div>
																						                    <label htmlFor="field-app-dashboard-users-page-tsx-2" className="block text-sm font-medium text-gray-700 mb-1">{t("Email Address *")}</label>
																						                    <Input id="field-app-dashboard-users-page-tsx-2"
																												                    type="email"
																												                    value={formData.email}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
																												                    placeholder="sarah@clinic.com"
																												                    required
																												                  />
																	  </div>
																	                  <div>
																						                    <label htmlFor="field-app-dashboard-users-page-tsx-3" className="block text-sm font-medium text-gray-700 mb-1">
																												                    {t("Password")} {editingUser ? t("(leave blank to keep current)") : '*'}
																						  </label>
																						                    <Input id="field-app-dashboard-users-page-tsx-3"
																												                    type="password"
																												                    value={formData.password}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
																												                    placeholder={t("Min. 8 characters")}
																												                    required={!editingUser}
																												                  />
																	  </div>
																	                  <div>
																						                    <label htmlFor="field-app-dashboard-users-page-tsx-4" className="block text-sm font-medium text-gray-700 mb-1">{t("Role *")}</label>
																						                    <select id="field-app-dashboard-users-page-tsx-4"
 aria-label={t("Role")}
																												                    value={formData.role}
 disabled={editingUser?.role === 'SUPER_ADMIN'}
																												                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' }))}
																												                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																												                    required
																												                  >
																												<option value="STAFF">{t("Staff")}</option>
																												{actor?.role === 'SUPER_ADMIN' && <option value="ADMIN">{t("Admin")}</option>}
{editingUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">{t("Super Admin")}</option>}
																						  </select>
																	  </div>
													</div>
													              <div className="flex gap-3 pt-2">
																	                  <Button type="submit" disabled={submitting}>
																						  {submitting ? t("Saving...") : (editingUser ? t("Save Changes") : t("Add Staff Member"))}
																	  </Button>
																	                  <Button type="button" variant="outline" onClick={resetForm}>{t("Cancel")}</Button>
													</div>
									</form>
					  </CardContent>
					          </Card>
				        )}
			  
			  {/* Users Table */}
			        <Card>
						        <CardHeader>
									          <CardTitle className="flex items-center justify-between">
												  <span>{t("Staff Members")}</span>
												              <span className="text-sm font-normal text-gray-500">{t("{count} staff members", {count: users.length})}</span>
									</CardTitle>
						</CardHeader>
						        <CardContent>
									{loading ? (
										            <div className="flex justify-center py-12">
											              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
											            </div>
										          ) : users.length === 0 ? (
										            <div className="text-center py-12 text-gray-500">
											<p className="text-lg font-medium">{t("No staff members yet")}</p>
											<p className="text-sm mt-1">{t("Add your first staff member to get started")}</p>
											            </div>
										          ) : (
										            <div className="overflow-x-auto">
											              <table className="w-full text-sm">
															                  <thead>
																				                    <tr className="border-b border-gray-200">
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Name")}</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Email")}</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Role")}</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Status")}</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Sessions")}</th>
																										                    <th className="text-left py-3 px-2 font-semibold text-gray-700">{t("Joined")}</th>
																										                    <th className="text-right py-3 px-2 font-semibold text-gray-700">{t("Actions")}</th>
																				  </tr>
															  </thead>
															                  <tbody>
																				  {users.map((user) => (
																					                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
																						                        <td className="py-3 px-2 font-medium text-gray-900">{user.name}</td>
																						                        <td className="py-3 px-2 text-gray-600">{user.email}</td>
																						                        <td className="py-3 px-2">
																													                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
																																				{t(ROLE_LABELS[user.role])}
																													</span>
																						  </td>
																						                        <td className="py-3 px-2">
																													                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
																																				{user.active ? t("Active") : t("Inactive")}
																													</span>
																						  </td>
																						                        <td className="py-3 px-2 text-gray-600">{user._count.sessions}</td>
																						                        <td className="py-3 px-2 text-gray-600">{formatDate(user.createdAt, language)}</td>
																						                        <td className="py-3 px-2">
																													                        <div className="flex gap-2 justify-end">
																																				                          <Button
																																										                              variant="outline"
																																																	                              size="sm"
																																																								                              disabled={actor?.role !== 'SUPER_ADMIN' && user.role !== 'STAFF'}
 onClick={() => openEditForm(user)}
																																																															                            >
																																																																						                            {t("Edit")} </Button>
																																				                          <Button
																																										                              variant="outline"
																																																	                              size="sm"
																																																								                              disabled={user.role === 'SUPER_ADMIN' || user.id === actor?.id || (actor?.role !== 'SUPER_ADMIN' && user.role !== 'STAFF')}
 onClick={() => handleToggleActive(user)}
																																																															                              className={user.active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
																																																																						                            >
																																																																													                            {user.active ? t("Deactivate") : t("Activate")}
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
