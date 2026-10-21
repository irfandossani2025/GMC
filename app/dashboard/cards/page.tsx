'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatMembershipType } from '@/lib/clinic';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getJson } from '@/lib/api-client';

interface CardRecord {
  id: string;
  cardNumber: string;
  barcode: string;
  issuedDate: string;
  expiryDate: string;
  member?: {
    id: string;
    memberId: string;
    name: string;
    membershipType: string;
  };
}

export default function CardsPage() {
  const { t, formatDate: formatDisplayDate } = useLanguage();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [loadError,setLoadError]=useState(''), [retry,setRetry]=useState(0), [search,setSearch]=useState('');
  const visibleCards=cards.filter(card=>[card.cardNumber,card.member?.name,card.member?.memberId].some(value=>value?.toLowerCase().includes(search.trim().toLowerCase())));
  useEffect(() => {
    setIsLoading(true);setLoadError('');
    const fetchCards = async () => {
      try {
        const response = await getJson<CardRecord[]>('/api/cards/generate');
        setCards(response);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load membership cards.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [retry]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
          {t("Grand Medical Center")} </p>
        <h1 className="page-title mt-2">{t("Issued membership cards")}</h1>
        <p className="page-subtitle mt-3">
          {t("Track recent barcode card generation and jump directly into each member profile to print the front and back PDF version.")} </p>
      </div>

      <Card className="surface-panel rounded-xl border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t("Recent card activity")}</CardTitle>
        </CardHeader>
        <CardContent>
 <div className="mb-5"><Input type="search" label={t("Find a membership card")} placeholder={t("Search by card number, patient name or member ID")} value={search} onChange={e=>setSearch(e.target.value)}/></div>
 {loadError ? <div className="feedback-banner error" role="alert"><p>{t(loadError)}</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>{t("Try again")}</Button></div> : isLoading ? (
            <div className="py-10 text-center text-slate-500">{t("Loading issued cards...")}</div>
          ) : visibleCards.length === 0 ? (
            <div className="py-10 text-center text-slate-500">{t(search ? "No cards match your search." : "No cards have been issued yet.")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("Card Number")}</th>
                    <th className="px-4 py-3">{t("Member")}</th>
                    <th className="px-4 py-3">{t("Membership")}</th>
                    <th className="px-4 py-3">{t("Issued")}</th>
                    <th className="px-4 py-3">{t("Expiry")}</th>
                    <th className="px-4 py-3">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-mono text-sm text-slate-700">{card.cardNumber}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{card.member?.name || t("Unknown member")}</p>
                        <p className="text-sm text-slate-500">{card.member?.memberId}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {card.member ? t(formatMembershipType(card.member.membershipType)) : t("N/A")}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDisplayDate(card.issuedDate)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDisplayDate(card.expiryDate)}</td>
                      <td className="px-4 py-4 text-sm">
                        {card.member?.id ? (
                          <Link href={`/dashboard/members/${card.member.id}`} className="font-medium text-primary">
                            {t("Open member")} </Link>
                        ) : (
                          <span className="text-slate-400">{t("Unavailable")}</span>
                        )}
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
