'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
  const { t, formatDate: formatDisplayDate } = useLanguage();
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
  const [loadError, setLoadError] = useState(false);

  const [retry,setRetry]=useState(0);
  useEffect(() => {
    setIsLoading(true);setLoadError(false);
    const fetchStats = async () => {
      try {
        const data = await getJson<DashboardStats>('/api/dashboard/stats');
        setStats(data);
      } catch (error) {
        setLoadError(true);
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [retry]);

  const metrics = [
    {label: 'Total patients', value: stats.totalMembers, icon: 'patients', note: 'Registered in your clinic'},
    {label: 'Active memberships', value: stats.activeMembers, icon: 'shield', note: 'Current patient memberships'},
    {label: 'Sessions today', value: stats.sessions?.today ?? 0, icon: 'scan', note: 'Treatment sessions recorded'},
    {label: 'Expiring soon', value: stats.expiringSoon, icon: 'sessions', note: 'Within the next 30 days'},
  ];
  return <div className="space-y-6 dashboard-overview">
    <div className="overview-heading"><div><p className="section-eyebrow">{t("CLINIC OVERVIEW")}</p><h1>{t("Operational dashboard")}</h1><p className="mt-2 text-slate-500">{t("A clear view of your patients, memberships, and daily activity.")}</p></div><Link href="/dashboard/reports" className="overview-report-link">{t("View reports")} <AppIcon name="arrow" /></Link></div>
    {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t("Dashboard information could not be loaded. Please refresh the page to try again.")} <button className="underline font-semibold" onClick={()=>setRetry(value=>value+1)}>{t("Try again")}</button></div>}
    <div className="overview-metrics">{metrics.map(metric => <Card key={metric.label} className="metric-panel"><CardContent><div className="metric-top"><span>{t(metric.label)}</span><span className="metric-icon"><AppIcon name={metric.icon} /></span></div><p className="metric-value">{isLoading || loadError ? '—' : metric.value.toLocaleString()}</p><p className="metric-note">{t(metric.note)}</p></CardContent></Card>)}</div>
    <Card className="overview-summary"><CardContent><div><span>{t("Cards issued")}</span><strong>{isLoading || loadError ? '—' : stats.cardsIssued.toLocaleString()}</strong></div><div><span>{t("Sessions this month")}</span><strong>{isLoading || loadError ? '—' : (stats.sessions?.thisMonth ?? 0).toLocaleString()}</strong></div><div><span>{t("Active packages")}</span><strong>{isLoading || loadError ? '—' : (stats.activeMemberPackages ?? 0).toLocaleString()}</strong></div></CardContent></Card>
    <div><div className="section-heading"><h2>{t("Quick actions")}</h2><p>{t("Everyday clinic tasks")}</p></div><div className="overview-actions">{[
      {href: '/dashboard/members/new', icon: 'patients', title: 'Register patient', detail: 'Create a patient membership'},
      {href: '/dashboard/scan', icon: 'scan', title: 'Scan membership card', detail: 'Find a patient and process a session'},
      {href: '/dashboard/sessions', icon: 'sessions', title: 'Review sessions', detail: 'Browse treatment session history'},
      {href: '/dashboard/treatments', icon: 'treatments', title: 'Manage treatments', detail: 'Maintain treatments and packages'},
    ].map(action => <Link href={action.href} className="quick-action" key={action.href}><span className="quick-action-icon"><AppIcon name={action.icon} /></span><div><strong>{t(action.title)}</strong><p>{t(action.detail)}</p></div><AppIcon name="arrow" /></Link>)}</div></div>
    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{t("Membership renewals")}</CardTitle><p className="mt-1 text-sm text-slate-500">{t("Patients with memberships expiring in the next 30 days")}</p></div><Link href="/dashboard/members" className="text-sm font-medium text-primary">{t("View all patients →")}</Link></CardHeader><CardContent>
      {isLoading ? <div className="empty-state" role="status">{t("Loading membership information…")}</div> : loadError ? <div className="empty-state">{t("Membership information is currently unavailable.")}</div> : stats.expiringMembers.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><AppIcon name="shield" /></span><strong>{t("No upcoming renewals")}</strong><p>{t("No memberships are expiring within the next 30 days.")}</p></div> : <div className="renewal-list">{stats.expiringMembers.map(member => <Link key={member.id} href={`/dashboard/members/${member.id}`} className="renewal-row"><div><strong>{member.name}</strong><p>{member.memberId}</p></div><span>{t("Expires {date}", {date: formatDisplayDate(member.expiryDate)})}</span><AppIcon name="arrow" /></Link>)}</div>}
    </CardContent></Card>
  </div>;
}
