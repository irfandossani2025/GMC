'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getJson, postJson } from '@/lib/api-client';

interface TreatmentPackage {
	  id: string;
	  name: string;
	  sessionCount: number;
	  price: number;
	  validityMonths: number;
	  treatment: {
		      id: string;
		      name: string;
		      category: string;
	  };
}

export default function NewMemberPage() {
	  const router = useRouter();
	  const [isSaving, setIsSaving] = useState(false);
	  const [error, setError] = useState('');
	  const [packages, setPackages] = useState<TreatmentPackage[]>([]);
	  const [packagesLoading, setPackagesLoading] = useState(true);
	  const [formData, setFormData] = useState({
		      name: '',
		      email: '',
		      phone: '',
		      membershipType: 'STANDARD',
		      expiryDate: '',
		      gender: '',
		      address: '',
		      packageId: '',
	  });
	
	  useEffect(() => {
		      getJson<Array<{ packages: TreatmentPackage[] }>>('/api/treatments')
		        .then((treatments) => {
				          const allPackages = treatments.flatMap((t) => t.packages || []);
				          setPackages(allPackages);
				          if (allPackages.length > 0) {
							            setFormData((f) => ({ ...f, packageId: allPackages[0].id }));
						  }
			  })
		        .catch(() => setError('Failed to load treatment packages.'))
		        .finally(() => setPackagesLoading(false));
	  }, []);
	
	  const updateField = (field: keyof typeof formData, value: string) => {
		      setFormData((current) => ({ ...current, [field]: value }));
	  };
	
	  const handleSubmit = async (e: FormEvent) => {
		      e.preventDefault();
		      setError('');
		  
		      if (!formData.name.trim()) { setError('Full name is required.'); return; }
		      if (!formData.phone.trim()) { setError('Phone number is required.'); return; }
		      if (!formData.expiryDate) { setError('Expiry date is required.'); return; }
		      if (!formData.packageId) { setError('Please select a treatment package.'); return; }
		  
		      setIsSaving(true);
		      try {
				        // 1. Create the member
				        const member = await postJson<{ id: string }>('/api/members', {
							        name: formData.name.trim(),
							        email: formData.email.trim() || undefined,
							        phone: formData.phone.trim(),
							        membershipType: formData.membershipType,
							        expiryDate: new Date(formData.expiryDate).toISOString(),
							        gender: formData.gender || undefined,
							        address: formData.address.trim() || undefined,
						});
				  
				        // 2. Assign the selected treatment package
				        await postJson(`/api/members/${member.id}/packages`, {
							        packageId: formData.packageId,
						});
				  
				        router.push(`/dashboard/members/${member.id}`);
			  } catch (err: any) {
				        setError(err?.message || 'Failed to create member. Please try again.');
			  } finally {
				        setIsSaving(false);
			  }
	  };
	
	  const selectedPackage = packages.find((p) => p.id === formData.packageId);
	
	  return (
		      <div className="max-w-2xl space-y-6">
			        <div>
						        <Link href="/dashboard/members" className="text-sm text-slate-500 hover:text-slate-700">
									          ← Back to patients
						</Link>
						<h1 className="mt-2 text-2xl font-bold text-slate-900">Create a new patient</h1>
						        <p className="mt-1 text-slate-500">
									          Fill in the patient details, select their initial treatment package, and the membership card will be created automatically.
						</p>
			  </div>
			  
			        <form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
							        )}
						
						        <Card>
									          <CardHeader>
												  <CardTitle>Patient information</CardTitle>
									</CardHeader>
									          <CardContent className="space-y-4">
												              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">
																										Patient Name <span className="text-red-500">*</span>
																					</label>
																					                <Input
																										                  placeholder="Patient full name"
																										                  value={formData.name}
																										                  onChange={(e) => updateField('name', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">
																										Phone Number <span className="text-red-500">*</span>
																					</label>
																					                <Input
																										                  placeholder="+968..."
																										                  value={formData.phone}
																										                  onChange={(e) => updateField('phone', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
																					                <Input
																										                  type="email"
																										                  placeholder="patient@example.com"
																										                  value={formData.email}
																										                  onChange={(e) => updateField('email', e.target.value)}
																										                />
																  </div>
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">
																										Expiry Date <span className="text-red-500">*</span>
																					</label>
																					                <Input
																										                  type="date"
																										                  value={formData.expiryDate}
																										                  onChange={(e) => updateField('expiryDate', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">Membership Type</label>
																					                <select
																										                  value={formData.membershipType}
																										                  onChange={(e) => updateField('membershipType', e.target.value)}
																										                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
																										                >
																										<option value="STANDARD">Standard</option>
																										<option value="PREMIUM">Premium</option>
																										<option value="CORPORATE">Corporate</option>
																					</select>
																  </div>
																                <div>
																					                <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
																					                <select
																										                  value={formData.gender}
																										                  onChange={(e) => updateField('gender', e.target.value)}
																										                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
																										                >
																										<option value="">Select gender</option>
																										<option value="MALE">Male</option>
																										<option value="FEMALE">Female</option>
																										<option value="OTHER">Other</option>
																					</select>
																  </div>
												  </div>
												              <div>
																                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
																                <textarea
																					                placeholder="Home address or city details"
																					                value={formData.address}
																					                onChange={(e) => updateField('address', e.target.value)}
																					                rows={2}
																					                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
																					              />
												  </div>
									</CardContent>
						</Card>
						
						        <Card>
									          <CardHeader>
												              <CardTitle>
																  Treatment package <span className="text-red-500">*</span>
												  </CardTitle>
									</CardHeader>
									          <CardContent>
												  {packagesLoading ? (
													                <p className="text-sm text-slate-500">Loading packages...</p>
													              ) : packages.length === 0 ? (
													                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
														                  No treatment packages available. Please{' '}
														                  <Link href="/dashboard/treatments" className="font-medium underline">
																			                    add a treatment package
														  </Link>{' '}
														                  first before registering patients.
														                </div>
													              ) : (
													                <div className="space-y-3">
														                  <p className="text-sm text-slate-500">
																			                    Select the treatment package this patient is purchasing. Sessions will be loaded onto their account immediately.
														  </p>
														                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
																			  {packages.map((pkg) => (
																				                      <label
																										                        key={pkg.id}
																										                        className={`flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-4 transition-colors ${
																					                          formData.packageId === pkg.id
																																		                             ? 'border-primary bg-primary/5'
																																		                             : 'border-slate-200 hover:border-slate-300'
																																		  }`}
																										                      >
																					                        <input
																												                        type="radio"
																												                        name="packageId"
																												                        value={pkg.id}
																												                        checked={formData.packageId === pkg.id}
																												                        onChange={(e) => updateField('packageId', e.target.value)}
																												                        className="sr-only"
																												                      />
																					                        <span className="font-semibold text-slate-900">{pkg.name}</span>
																					                        <span className="text-xs text-slate-500">{pkg.treatment.name} · {pkg.treatment.category}</span>
																					                        <div className="mt-1 flex flex-wrap gap-2">
																												                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
																																			{pkg.sessionCount} sessions
																												</span>
																												                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
																																			{pkg.validityMonths} months
																												</span>
																												                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
																																			{pkg.price.toFixed(2)} OMR
																												</span>
																					  </div>
																					                      </label>
																				                    ))}
														  </div>
														  {selectedPackage && (
															                    <p className="text-xs text-slate-400">
																                      Selected: {selectedPackage.name} — {selectedPackage.sessionCount} sessions for {selectedPackage.price.toFixed(2)} OMR
																                    </p>
															                  )}
														                </div>
													              )}
									</CardContent>
						</Card>
						
						        <div className="flex items-center gap-3">
									          <Button type="submit" disabled={isSaving || packages.length === 0}>
												  {isSaving ? 'Creating patient...' : 'Create patient, card & package'}
									</Button>
									          <Link href="/dashboard/members">
												  <Button variant="outline" type="button">Cancel</Button>
									</Link>
						</div>
			  </form>
			      </div>
		    );
}
