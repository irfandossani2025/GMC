'use client';

import { LanguageSwitcher, useLanguage } from '@/components/i18n/LanguageProvider';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WorkflowGuide } from '@/components/ui/WorkflowGuide';
import { AppIcon } from '@/components/ui/AppIcon';
import { postJson } from '@/lib/api-client';

const navigation = [
 {label: 'Email settings', href: '/dashboard/settings/email', icon: 'mail', roles: ['SUPER_ADMIN'], group: 'Settings'},
 {label: 'Overview', href: '/dashboard', icon: 'dashboard', roles: ['ADMIN', 'MANAGER'], group: 'Workspace'},
 {label: 'Patients', href: '/dashboard/members', icon: 'patients', roles: ['ADMIN', 'MANAGER'], group: 'Workspace'},
 {label: 'Scan card', href: '/dashboard/scan', icon: 'scan', roles: ['ADMIN', 'MANAGER', 'STAFF'], group: 'Workspace'},
 {label: 'Treatments', href: '/dashboard/treatments', icon: 'treatments', roles: ['ADMIN', 'MANAGER'], group: 'Workspace'},
 {label: 'Membership cards', href: '/dashboard/cards', icon: 'cards', roles: ['ADMIN', 'MANAGER'], group: 'Workspace'},
 {label: 'Session history', href: '/dashboard/sessions', icon: 'sessions', roles: ['ADMIN', 'MANAGER'], group: 'Management'},
 {label: 'Reports', href: '/dashboard/reports', icon: 'reports', roles: ['ADMIN', 'MANAGER'], group: 'Management'},
 {label: 'Staff & access', href: '/dashboard/users', icon: 'users', roles: ['ADMIN'], group: 'Management'},
];
export default function DashboardLayout({children}: {children: React.ReactNode}) {
  const { t } = useLanguage();
 const router = useRouter(); const pathname = usePathname();
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [userRole, setUserRole] = useState<string>('STAFF');
 useEffect(() => {fetch('/api/auth/me').then(r => r.json()).then(data => {if(data.role) setUserRole(data.role);}).catch(() => {});}, []);
 useEffect(() => {setIsMenuOpen(false);}, [pathname]);
 useEffect(() => {
  if (!isMenuOpen) return;
  const close = (event: KeyboardEvent) => {if (event.key === 'Escape') setIsMenuOpen(false);};
  window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
 }, [isMenuOpen]);
 const handleLogout = async () => {try {await postJson('/api/auth/logout'); router.push('/auth/login');} catch(error) {console.error('Logout error:', error);}};
 const items = navigation.filter(item => userRole === 'SUPER_ADMIN' || item.roles.includes(userRole));
 const guidePage = pathname.includes('/settings/email') ? 'email' : pathname.endsWith('/members/new') ? 'registration' : /^\/dashboard\/members\/[^/]+$/.test(pathname) ? 'profile' : pathname.endsWith('/members') ? 'patients' : pathname.endsWith('/users') ? 'staff' : pathname.split('/').pop() || 'overview';
 const active = items.find(item => item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href));
 return <div className="app-workspace">
  <a href="#main-content" className="skip-link">{t("Skip to content")}</a>
  {isMenuOpen && <button className="sidebar-overlay no-print" aria-label={t("Close navigation")} onClick={() => setIsMenuOpen(false)} />}
  <aside id="workspace-navigation" className={`app-sidebar no-print ${isMenuOpen ? 'is-open' : ''}`}>
   <Link href={userRole === 'STAFF' ? '/dashboard/scan' : '/dashboard'} className="sidebar-brand"><img src="/gmc-logo.png" alt="" /><span><strong>{t("Grand Medical Care")}</strong><small>{t("MEMBERSHIP PORTAL")}</small></span></Link>
   <button className="mobile-sidebar-close" aria-label={t("Close navigation")} onClick={() => setIsMenuOpen(false)}><AppIcon name="close" /></button>
   <nav aria-label={t("Main navigation")}>{['Workspace', 'Management', 'Settings'].map(group => {
    const links = items.filter(item => item.group === group); return links.length ? <div className="nav-group" key={group}><p>{t(group)}</p>{links.map(item => <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} aria-current={active?.href === item.href ? 'page' : undefined} className={`sidebar-link ${active?.href === item.href ? 'active' : ''}`}><AppIcon name={item.icon} /><span>{t(item.label)}</span></Link>)}</div> : null;
   })}</nav>
   <div className="sidebar-bottom"><div className="sidebar-account"><span className="account-avatar"><AppIcon name="shield" /></span><span><strong>{t(userRole)}</strong><small>{t("Clinic administration")}</small></span></div><button className="sidebar-logout" onClick={handleLogout}><AppIcon name="logout" />{t("Sign out")}</button></div>
  </aside>
  <div className="app-main">
   <header className="app-topbar no-print"><div className="topbar-location"><button className="mobile-menu" aria-label={t("Open navigation")} aria-expanded={isMenuOpen} aria-controls="workspace-navigation" onClick={() => setIsMenuOpen(true)}><AppIcon name="menu" /></button><span className="topbar-parent">{t("Clinic workspace")}</span><span className="breadcrumb-divider">/</span><strong>{t(active?.label || 'Administration')}</strong></div><div className="topbar-actions"><LanguageSwitcher /><span className="portal-label"><AppIcon name="shield" />{t("Membership management")}</span><Link className="topbar-primary" href={userRole === 'STAFF' ? '/dashboard/scan' : '/dashboard/members/new'}><AppIcon name={userRole === 'STAFF' ? 'scan' : 'plus'} />{userRole === 'STAFF' ? t("Scan card") : t("New patient")}</Link></div></header>
   <main id="main-content" className="app-content" tabIndex={-1}><WorkflowGuide key={pathname} page={guidePage}/>{children}</main>
   <div className="workspace-footer no-print"><span>{t("Grand Medical Care")}</span><span>{t("Membership Operations")}</span></div>
  </div>
 </div>;
}
