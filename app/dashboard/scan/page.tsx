'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getJson, postJson } from '@/lib/api-client';
import { formatDisplayDate } from '@/lib/clinic';

interface ScanMember {
	  id: string;
	  memberId: string;
	  name: string;
	  phone: string;
	  email?: string;
	    membershipType: string;
	  status: string;
	  expiryDate: string;
}

interface ScanCard {
	  id: string;
	  barcode: string;
	  cardNumber: string;
	  issuedDate: string;
	  expiryDate: string;
}

interface ScanPackage {
	  id: string;
	  name: string;
	  treatmentName: string;
	  sessionCount: number;
	  remainingSessions: number;
	  expiryDate: string;
	  status: string;
}

interface ScanSession {
	  id: string;
	  sessionNumber: number;
	  status: string;
	  completedAt?: string;
	  notes?: string;
	  packageName: string;
	  treatmentName: string;
	  processedBy?: string;
}

interface ScanResult {
	  member: ScanMember;
	  card: ScanCard | null;
	  activePackages: ScanPackage[];
	  totalRemainingSessions: number;
	  recentSessions: ScanSession[];
}

interface SessionProcessResponse {
	  session: ScanSession;
	  memberPackage: ScanPackage;
	  whatsappLink: string;
	    whatsappSent?: boolean;
		        whatsappMethod?: string;
}

export default function ScanPage() {
	  const [barcode, setBarcode] = useState('');
	  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
	  const [selectedPackageId, setSelectedPackageId] = useState('');
	  const [isLoading, setIsLoading] = useState(false);
	  const [isProcessing, setIsProcessing] = useState(false);
	  const [message, setMessage] = useState('');
	  const [whatsappLink, setWhatsappLink] = useState('');
	
	  // Manual entry mode
	  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');
	  const [manualCardNumber, setManualCardNumber] = useState('');

	  useEffect(() => {
		      const params = new URLSearchParams(window.location.search);
		      const queryBarcode = params.get('barcode');
		      if (queryBarcode) {
				        setBarcode(queryBarcode);
		      }
	  }, []);
	
	  const handleSearch = async () => {
		      const searchValue = inputMode === 'manual' ? manualCardNumber.trim() : barcode.trim();
		      if (!searchValue) {
				        setMessage('Please enter a barcode or card number.');
				        return;
			  }
		  
		      setIsLoading(true);
		      setMessage('');
		      setScanResult(null);
		      setSelectedPackageId('');
		      setWhatsappLink('');
		  
    const isMemberId = searchValue.toUpperCase().startsWith('GMC-');
		  try {
				                  const data = await getJson<ScanResult>(`/api/scan?${isMemberId ? `memberId=${encodeURIComponent(searchValue)}` : `barcode=${encodeURIComponent(searchValue)}`}`);
				        setScanResult(data);
				        // Auto-select first active package
				        if (data.activePackages.length > 0) {
							        setSelectedPackageId(data.activePackages[0].id);
						}
			  } catch (err: unknown) {
				        const error = err as { message?: string };
											        setMessage(error.message || 'Member not found. Please check the barcode or card number.');
											 } finally {
												       setIsLoading(false);
											 }
			  };
		  
		    const handleProcessSession = async () => {
				    if (!scanResult) return;
				    if (!selectedPackageId) {
						      setMessage('Select an active package before processing.');
						      return;
					}
				
				    setIsProcessing(true);
				    setMessage('');
				    setWhatsappLink('');
				
				    try {
						      const response = await postJson<SessionProcessResponse>('/api/sessions', {
								          barcode: scanResult.card?.barcode,
								          packageId: selectedPackageId,
							  });
						
						      const msg = response.whatsappSent
							          ? 'Session confirmed. WhatsApp notification sent automatically.'
							          : 'Session confirmed. Use the button below to send a WhatsApp notification.';
						
						      setMessage(msg);
						      if (response.whatsappLink) {
								          setWhatsappLink(response.whatsappLink);
							  }
						
						      // Refresh scan result to show updated session count
						      const searchValue = inputMode === 'manual' ? manualCardNumber.trim() : barcode.trim();
						                const isMemberIdRefresh = searchValue.toUpperCase().startsWith('GMC-');
						                const updated = await getJson<ScanResult>(`/api/scan?${isMemberIdRefresh ? `memberId=${encodeURIComponent(searchValue)}` : `barcode=${encodeURIComponent(searchValue)}`}`);
						      if (updated.activePackages.length > 0) {
								          const stillActive = updated.activePackages.find((p) => p.id === selectedPackageId);
								          setSelectedPackageId(stillActive ? stillActive.id : updated.activePackages[0].id);
							  }
					} catch (err: unknown) {
						      const error = err as { message?: string };
													      setMessage(error.message || 'Failed to process session. Please try again.');
												   } finally {
													         setIsProcessing(false);
												   }
					};
				
				  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
					      if (e.key === 'Enter') {
							        handleSearch();
						  }
				  };
				
				  const handleModeSwitch = (mode: 'scan' | 'manual') => {
					      setInputMode(mode);
					      setMessage('');
					      setScanResult(null);
					      setSelectedPackageId('');
					      setWhatsappLink('');
				  };
				
				  return (
					      <div className="space-y-6">
						        <div>
									<h1 className="text-2xl font-bold text-slate-900">Reception Desk</h1>
									        <p className="text-slate-600 mt-1">
												          Scan membership card
									</p>
									        <p className="text-sm text-slate-500 mt-1">
												          Use the member barcode to load session balance, confirm attendance, and generate a WhatsApp
												          notification when the session is recorded.
									</p>
						  </div>
						  
						        <Card>
									        <CardHeader>
												<CardTitle>Scan or search barcode</CardTitle>
									</CardHeader>
									        <CardContent className="space-y-4">
												{/* Mode toggle */}
												          <div className="flex rounded-lg border border-gray-200 overflow-hidden w-full sm:w-auto">
															              <button
																			                onClick={() => handleModeSwitch('scan')}
																			                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium transition-colors ${
																                  inputMode === 'scan'
																									                     ? 'bg-blue-600 text-white'
																									                     : 'bg-white text-slate-600 hover:bg-slate-50'
																									  }`}
																			              >
																			                Barcode / QR Scan
															  </button>
															              <button
																			                onClick={() => handleModeSwitch('manual')}
																			                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
																                  inputMode === 'manual'
																									                     ? 'bg-blue-600 text-white'
																									                     : 'bg-white text-slate-600 hover:bg-slate-50'
																									  }`}
																			              >
																			                Manual Card Entry
															  </button>
												</div>
												
												{inputMode === 'scan' ? (
													            <div className="flex flex-col sm:flex-row gap-2">
														              <input
																		                  type="text"
																		                  value={barcode}
																		                  onChange={(e) => setBarcode(e.target.value)}
																		                  onKeyDown={handleKeyDown}
																		                  placeholder="Scan or type barcode here..."
																		                  autoFocus
																		                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
																		                />
														              <Button
																		                  variant="primary"
																		                  onClick={handleSearch}
																		                  isLoading={isLoading}
																		                  className="w-full sm:w-auto"
																		                >
																		                  Search
														</Button>
														            </div>
													          ) : (
													            <div className="space-y-3">
														              <p className="text-sm text-slate-500">
																		                  Enter the member&apos;s card number (e.g. GMC-XXXX-XXXXXX) or any unique identifier
																		                  printed on the membership card.
														</p>
														              <div className="flex flex-col sm:flex-row gap-2">
																		                  <input
																							                    type="text"
																							                    value={manualCardNumber}
																							                    onChange={(e) => setManualCardNumber(e.target.value)}
																							                    onKeyDown={handleKeyDown}
																							                    placeholder="e.g. GMC-MOXG5HWF-082IAU"
																							                    autoFocus
																							                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
																							                  />
																		                  <Button
																							                    variant="primary"
																							                    onClick={handleSearch}
																							                    isLoading={isLoading}
																							                    className="w-full sm:w-auto"
																							                  >
																							                    Look Up
																		  </Button>
														</div>
														            </div>
													          )}
									</CardContent>
						  </Card>
						  
						  {message && (
							          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
								  {message}
								          </div>
							        )}
						  
						  {scanResult && (
							          <div className="space-y-4">
								  {/* Member info */}
								            <Card>
												            <CardHeader>
																<CardTitle>Member found</CardTitle>
												</CardHeader>
												            <CardContent>
																              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
																									                    <p className="font-semibold text-slate-900">{scanResult.member.name}</p>
																				  </div>
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Member ID</p>
																									                    <p className="font-mono text-slate-900">{scanResult.member.memberId}</p>
																				  </div>
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
																									                    <p className="text-slate-900">{scanResult.member.phone}</p>
																				  </div>
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
																									                    <span
																															                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
																										                        scanResult.member.status === 'ACTIVE'
																																                        ? 'bg-green-100 text-green-700'
																																						                        : 'bg-red-100 text-red-700'
																																												                    }`}
																															                  >
																															{scanResult.member.status}
																									  </span>
																				  </div>
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Remaining Sessions</p>
																									                    <p className="text-2xl font-bold text-blue-600">{scanResult.totalRemainingSessions}</p>
																				  </div>
																				                  <div>
																									                    <p className="text-xs text-slate-500 uppercase tracking-wide">Expiry Date</p>
																									                    <p className="text-slate-900">{formatDisplayDate(scanResult.member.expiryDate)}</p>
																				  </div>
																</div>
												</CardContent>
								  </Card>
								  
								  {/* Package selection */}
								  {scanResult.activePackages.length > 0 ? (
									              <Card>
										                <CardHeader>
															<CardTitle>Select package for this session</CardTitle>
										  </CardHeader>
										                <CardContent className="space-y-3">
															{scanResult.activePackages.map((pkg) => (
																                  <label
																					                      key={pkg.id}
																					                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
																	                      selectedPackageId === pkg.id
																													                         ? 'border-blue-500 bg-blue-50'
																													                         : 'border-gray-200 hover:border-blue-300'
																													}`}
																					                    >
																	                    <input
																							                      type="radio"
																							                      name="package"
																							                      value={pkg.id}
																							                      checked={selectedPackageId === pkg.id}
																							                      onChange={() => setSelectedPackageId(pkg.id)}
																							                      className="mt-1"
																							                    />
																	                    <div className="flex-1">
																							                      <p className="font-medium text-slate-900">{pkg.name}</p>
																							                      <p className="text-sm text-slate-500">{pkg.treatmentName}</p>
																							                      <p className="text-sm text-slate-700 mt-1">
																													                          <span className="font-semibold text-blue-600">{pkg.remainingSessions}</span> sessions
																													                          remaining of {pkg.sessionCount}
																							</p>
																	</div>
																	                  </label>
																                ))}
															                <Button
																				                  variant="primary"
																				                  onClick={handleProcessSession}
																				                  isLoading={isProcessing}
																				                  className="w-full mt-2"
																				                >
																				                  Confirm Session
															</Button>
										  </CardContent>
										              </Card>
									            ) : (
									              <Card>
										                <CardContent>
															                <p className="text-sm text-slate-500 py-2">
																				                  No active packages found for this member. Please add a package before processing a
																				                  session.
															</p>
										  </CardContent>
										              </Card>
									            )}
								  
								  {/* WhatsApp link fallback */}
								  {whatsappLink && (
									              <Card>
										                <CardContent className="pt-4">
															                <p className="text-sm text-slate-600">
																				                  A WhatsApp notification was prepared for the patient. Open it to review or send the
																				                  confirmation message.
															</p>
															                <Button
																				                  variant="secondary"
																				                  onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
																				                >
																				                  Open WhatsApp message
															</Button>
										  </CardContent>
										              </Card>
									            )}
								  
								  {/* Recent sessions */}
								            <Card>
												            <CardHeader>
																<CardTitle>Recent session history</CardTitle>
												</CardHeader>
												            <CardContent>
																{scanResult.recentSessions.length === 0 ? (
																	                <p className="text-sm text-slate-500 p-4">No sessions have been processed yet for this
																		                  member.</p>
																	              ) : (
																	                <div className="space-y-3">
																		{scanResult.recentSessions.map((session) => (
																			                    <div key={session.id} className="rounded-2xl border border-slate-200 p-4">
																				                      <p className="font-semibold text-slate-900">Session {session.sessionNumber ?? '-'} &bull; {session.status}</p>
																				                      <p className="text-sm text-slate-600">{session.packageName ||
																											  session.treatmentName}</p>
																				                      <p className="text-sm text-slate-400">{formatDisplayDate(session.completedAt)}</p>
																				                    </div>
																			                  ))}
																		                </div>
																	              )}
												</CardContent>
								  </Card>
								          </div>
							        )}
						      </div>
					    );
			}
