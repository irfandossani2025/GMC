import React from 'react';
const paths: Record<string, string> = {
 mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
 dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 scan: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M7 12h10 M9 8v8 M15 8v8',
 patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
 treatments: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
 cards: 'M3 5h18v14H3z M3 10h18 M7 15h4',
 reports: 'M4 3v18h17 M9 16v-5 M14 16V7 M19 16v-8',
 sessions: 'M8 3v4 M16 3v4 M3 10h18 M3 5h18v16H3z M8 14h3 M8 17h7',
 users: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 21v-4a6 6 0 0 1 12 0v4 M9 17h6',
 arrow: 'M5 12h14 M14 7l5 5-5 5', plus: 'M12 5v14 M5 12h14',
 close: 'M6 6l12 12 M6 18L18 6', menu: 'M4 6h16 M4 12h16 M4 18h16',
 logout: 'M9 3H4v18h5 M9 12h12 M16 7l5 5-5 5',
 shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
};
export function AppIcon({name, className = ''}: {name: string; className?: string}) {
 return <svg data-icon={name} aria-hidden="true" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.dashboard} /></svg>;
}
