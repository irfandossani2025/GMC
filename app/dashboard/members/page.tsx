'use client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatMembershipType } from '@/lib/clinic';
import { requestJson } from '@/lib/api-client';
interface Member {id: string; memberId: string; name: string; phone: string; membershipType: string; status: string; expiryDate: string; cardIssued: boolean;}
interface MembersResponse {data: Member[]; pagination: {total: number; page: number; limit: number; pages: number};}
export default function MembersPage() {
  const {t} = useLanguage();
  const [members, setMembers] = useState<Member[]>([]), [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [status, setStatus] = useState('');
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [pages, setPages] = useState(1);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {const timer = setTimeout(() => {setQuery(search.trim());setPage(1);}, 300);return () => clearTimeout(timer);}, [search]);
  useEffect(() => {
    const controller = new AbortController(); setIsLoading(true); setError('');
    requestJson<MembersResponse>('/api/members', {method: 'GET', params: {page, search: query, status, limit: 10}, signal: controller.signal})
      .then(response => {if(controller.signal.aborted)return;setMembers(response.data);setTotal(response.pagination.total);setPages(Math.max(1,response.pagination.pages));})
      .catch(error => {if(!controller.signal.aborted)setError(error instanceof Error ? error.message : 'Failed to fetch members');})
      .finally(() => {if(!controller.signal.aborted)setIsLoading(false);});
    return () => controller.abort();
  }, [page, query, status, retry]);
  function clear() {setSearch('');setQuery('');setStatus('');setPage(1);}
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1>{t('Patients')}</h1><p className="mt-2 text-sm text-slate-500">{t('Find a patient, check their membership, or register someone new.')}</p></div><Link href="/dashboard/members/new" className="topbar-primary">+ {t('Add New Patient')}</Link></div>
    <Card><CardContent><div className="patient-search-toolbar"><Input type="search" label={t('Search patients')} placeholder={t('Search by name, phone, or member ID...')} value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off"/><div><label htmlFor="patient-status">{t('Membership status')}</label><select id="patient-status" className="mt-1 w-full px-3 py-2" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">{t('All Statuses')}</option>{['ACTIVE','INACTIVE','EXPIRED','SUSPENDED'].map(value=><option key={value} value={value}>{t(value)}</option>)}</select></div>{(search || status) && <Button type="button" variant="outline" onClick={clear}>{t('Clear filters')}</Button>}</div></CardContent></Card>
    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{t('Patient List')}</CardTitle><p className="text-xs text-slate-500" role="status">{!isLoading && !error && t('{count} patients',{count: total})}</p></CardHeader><CardContent aria-busy={isLoading}>
      {error ? <div className="feedback-banner error" role="alert"><p>{t(error)}</p><Button variant="outline" size="sm" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</Button></div> : isLoading ? <div className="empty-state" role="status">{t('Loading...')}</div> : members.length===0 ? <div className="empty-state"><strong>{t(query || status ? 'No patients match these filters.' : 'No patients registered yet.')}</strong><p>{t(query || status ? 'Try a different name, phone number or membership status.' : 'Register the first patient to create their membership card.')}</p>{query || status ? <Button type="button" variant="outline" onClick={clear}>{t('Clear filters')}</Button> : <Link className="patient-name-link" href="/dashboard/members/new">{t('Register patient')}</Link>}</div> : <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Patient ID")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Patient Name")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Phone")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Type")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Status")}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{t("Card")}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">{member.memberId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900"><Link href={`/dashboard/members/${member.id}`} className="patient-name-link"><bdi>{member.name}</bdi></Link></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.phone}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {t(formatMembershipType(member.membershipType))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : member.status === 'INACTIVE'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t(member.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.cardIssued
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {member.cardIssued ? t("Issued") : t("Pending")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right space-x-2">
                        <Link href={`/dashboard/members/${member.id}`}>
                          <span className="patient-view-link">{t("View")}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      <div className="table-pagination"><p>{t('Showing {start}–{end} of {total}',{start:(page-1)*10+1,end:Math.min(page*10,total),total})}</p><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={()=>setPage(value=>value-1)} disabled={isLoading || page<=1}>{t('Previous')}</Button><span>{t('Page {page} of {total}',{page,total:pages})}</span><Button variant="outline" size="sm" onClick={()=>setPage(value=>value+1)} disabled={isLoading || page>=pages}>{t('Next')}</Button></div></div>
      </>}
    </CardContent></Card>
  </div>;
}
