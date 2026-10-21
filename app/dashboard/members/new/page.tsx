'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { FormEvent, useEffect, useState, useRef } from 'react';
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
  const { t } = useLanguage();
  const errorRegion=useRef<HTMLDivElement>(null);
	  const router = useRouter();
	  const [isSaving, setIsSaving] = useState(false);
	  const [error, setError] = useState('');
	  const [packages, setPackages] = useState<TreatmentPackage[]>([]);
	  const [packagesLoading, setPackagesLoading] = useState(true);
	  const [formData, setFormData] = useState({
		      name: '',
		      patientId: '',
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
		  
		      if (formData.name.trim().length < 2) { setError('Enter the patient’s full name (at least 2 characters).'); return; }
		      if (formData.phone.trim().length < 10) { setError('Enter a phone number with at least 10 characters, including the country code.'); return; }
		      if (!formData.expiryDate) { setError('Expiry date is required.'); return; }
		      if (!formData.packageId) { setError('Please select a treatment package.'); return; }
		  
		      setIsSaving(true);
		      try {
				        // Save the patient, card and selected initial package in one transaction.
				        const member = await postJson<{ id: string }>('/api/members', {
							        packageId: formData.packageId,
 name: formData.name.trim(),
							        patientId: formData.patientId.trim() || undefined,
							        email: formData.email.trim() || undefined,
							        phone: formData.phone.trim(),
							        membershipType: formData.membershipType,
							        expiryDate: new Date(formData.expiryDate+'T23:59:59+04:00').toISOString(),
							        gender: formData.gender || undefined,
							        address: formData.address.trim() || undefined,
						});
				  
				        router.push(`/dashboard/members/${member.id}`);
			  } catch (err: any) {
				        setError(err?.message || 'Failed to create member. Please try again.');
			  } finally {
				        setIsSaving(false);
			  }
	  };
	
	  useEffect(()=>{if(error)errorRegion.current?.focus();},[error]);
  const selectedPackage = packages.find((p) => p.id === formData.packageId);
	
	  return (
		      <div className="max-w-2xl space-y-6">
			        <div>
						        <Link href="/dashboard/members" className="text-sm text-slate-500 hover:text-slate-700">
									          {t("← Back to patients")} </Link>
						<h1 className="mt-2 text-2xl font-bold text-slate-900">{t("Create a new patient")}</h1>
						        <p className="mt-1 text-slate-500">
									          {t("Fill in the patient details, select their initial treatment package, and the membership card will be created automatically.")} </p>
			  </div>
			  
			        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSaving}><fieldset disabled={isSaving} className="space-y-6"><p className="form-guidance">{t("Complete patient details, select a package, then create the membership. Fields marked * are required.")}</p>
						{error && (
							          <div ref={errorRegion} role="alert" tabIndex={-1} className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t(error)}</div>
							        )}
						
						        <Card>
									          <CardHeader>
												  <CardTitle>{t("Patient information")}</CardTitle>
									</CardHeader>
									          <CardContent className="space-y-4">
												              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-1" className="mb-1 block text-sm font-medium text-slate-700">
																										{t("Patient Name")} <span className="text-red-500">*</span>
																					</label>
																					                <Input id="field-app-dashboard-members-new-page-tsx-1"
																										                  placeholder={t("Patient full name")}
																										                  value={formData.name}
																										                  onChange={(e) => updateField('name', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-2" className="mb-1 block text-sm font-medium text-slate-700">
																										{t("Patient ID")} </label>
																					                <Input id="field-app-dashboard-members-new-page-tsx-2"
																										                  helperText={t("Optional. Leave blank to generate a unique patient ID.")} placeholder="e.g. GMC-001"
																										                  value={formData.patientId}
																										                  onChange={(e) => updateField('patientId', e.target.value)}
																										                />
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-3" className="mb-1 block text-sm font-medium text-slate-700">
																										{t("Phone Number")} <span className="text-red-500">*</span>
																					</label>
																					                <Input id="field-app-dashboard-members-new-page-tsx-3"
																										                  type="tel" minLength={10} helperText={t("Include the country code, for example +968.")} placeholder="+968..."
																										                  value={formData.phone}
																										                  onChange={(e) => updateField('phone', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-4" className="mb-1 block text-sm font-medium text-slate-700">{t("Email")}</label>
																					                <Input id="field-app-dashboard-members-new-page-tsx-4"
																										                  type="email"
																										                  placeholder="patient@example.com"
																										                  value={formData.email}
																										                  onChange={(e) => updateField('email', e.target.value)}
																										                />
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-5" className="mb-1 block text-sm font-medium text-slate-700">
																										{t("Expiry Date")} <span className="text-red-500">*</span>
																					</label>
																					                <Input id="field-app-dashboard-members-new-page-tsx-5"
																										                  type="date"
																										                  value={formData.expiryDate}
																										                  onChange={(e) => updateField('expiryDate', e.target.value)}
																										                  required
																										                />
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-6" className="mb-1 block text-sm font-medium text-slate-700">{t("Membership Type")}</label>
																					                <select id="field-app-dashboard-members-new-page-tsx-6"
																										                  value={formData.membershipType}
																										                  onChange={(e) => updateField('membershipType', e.target.value)}
																										                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
																										                >
																										<option value="STANDARD">{t("Standard")}</option>
																										<option value="PREMIUM">{t("Premium")}</option>
																										<option value="CORPORATE">{t("Corporate")}</option>
																					</select>
																  </div>
																                <div>
																					                <label htmlFor="field-app-dashboard-members-new-page-tsx-7" className="mb-1 block text-sm font-medium text-slate-700">{t("Gender")}</label>
																					                <select id="field-app-dashboard-members-new-page-tsx-7"
																										                  value={formData.gender}
																										                  onChange={(e) => updateField('gender', e.target.value)}
																										                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
																										                >
																										<option value="">{t("Select gender")}</option>
																										<option value="MALE">{t("Male")}</option>
																										<option value="FEMALE">{t("Female")}</option>
																										<option value="OTHER">{t("Other")}</option>
																					</select>
																  </div>
												  </div>
												              <div>
																                <label htmlFor="field-app-dashboard-members-new-page-tsx-8" className="mb-1 block text-sm font-medium text-slate-700">{t("Address")}</label>
																                <textarea id="field-app-dashboard-members-new-page-tsx-8"
																					                dir="auto" placeholder={t("Home address or city details")}
																					                value={formData.address}
																					                onChange={(e) => updateField('address', e.target.value)}
																					                rows={2}
																					                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
																					              />
												  </div>
									</CardContent>
						</Card>
						
						        <Card>
									          <CardHeader>
												              <CardTitle>
																  {t("Treatment package")} <span className="text-red-500">*</span>
												  </CardTitle>
									</CardHeader>
									          <CardContent>
												  {packagesLoading ? (
													                <p className="text-sm text-slate-500">{t("Loading packages...")}</p>
													              ) : packages.length === 0 ? (
													                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
														                  {t("No treatment packages available. Please")}{' '}
														                  <Link href="/dashboard/treatments" className="font-medium underline">
																			                    {t("add a treatment package")} </Link>{' '}
														                  {t("first before registering patients.")} </div>
													              ) : (
													                <div className="space-y-3">
														                  <p className="text-sm text-slate-500">
																			                    {t("Select the treatment package this patient is purchasing. Sessions will be loaded onto their account immediately.")} </p>
														                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
																			  {packages.map((pkg) => (
																				                      <label
																										                        key={pkg.id}
																										                        className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-4 transition-colors ${
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
																																			{pkg.sessionCount} {t("sessions")} </span>
																												                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
																																			{pkg.validityMonths} {t("months")} </span>
																												                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
																																			{pkg.price.toFixed(2)} {t("OMR")} </span>
																					  </div>
																					                      </label>
																				                    ))}
														  </div>
														  {selectedPackage && (
															                    <p className="text-xs text-slate-400">
																                      {t("Selected:")} {selectedPackage.name} — {selectedPackage.sessionCount} {t("sessions for")} {selectedPackage.price.toFixed(2)} {t("OMR")} </p>
															                  )}
														                </div>
													              )}
									</CardContent>
						</Card>
						
						        <div className="flex items-center gap-3">
									          <Button type="submit" isLoading={isSaving} disabled={packagesLoading || packages.length === 0}>
												  {isSaving ? t("Creating patient...") : t("Create patient, card & package")}
									</Button>
									          <Link href="/dashboard/members">
												  <Button variant="outline" type="button">{t("Cancel")}</Button>
									</Link>
						</div>
			  </fieldset></form>
			      </div>
		    );
}
