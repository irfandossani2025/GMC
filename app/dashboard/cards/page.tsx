'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDisplayDate, formatMembershipType } from '@/lib/clinic';
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
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await getJson<CardRecord[]>('/api/cards/generate');
        setCards(response);
      } catch (error) {
        console.error('Failed to fetch cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
          Grand Medical Center
        </p>
        <h1 className="page-title mt-2">Issued membership cards</h1>
        <p className="page-subtitle mt-3">
          Track recent barcode card generation and jump directly into each member profile to print the front and back PDF version.
        </p>
      </div>

      <Card className="surface-panel rounded-[1.75rem] border-0 shadow-none">
        <CardHeader>
          <CardTitle>Recent card activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading issued cards...</div>
          ) : cards.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No cards have been issued yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Card Number</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Membership</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-mono text-sm text-slate-700">{card.cardNumber}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{card.member?.name || 'Unknown member'}</p>
                        <p className="text-sm text-slate-500">{card.member?.memberId}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {card.member ? formatMembershipType(card.member.membershipType) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDisplayDate(card.issuedDate)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDisplayDate(card.expiryDate)}</td>
                      <td className="px-4 py-4 text-sm">
                        {card.member?.id ? (
                          <Link href={`/dashboard/members/${card.member.id}`} className="font-medium text-primary">
                            Open member
                          </Link>
                        ) : (
                          <span className="text-slate-400">Unavailable</span>
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
