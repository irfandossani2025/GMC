import type { MembershipCard, Prisma } from '@prisma/client';
import { generateBarcode } from '@/lib/auth';

type CardClient = Prisma.TransactionClient;
type MemberForCard = {
  id: string;
  expiryDate: Date;
};

const ACTIVE_CARD_STATUSES = ['ACTIVE', 'PRINTED'] as const;

export function generateCardNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CARD-${timestamp}-${random}`;
}

export async function createOrGetActiveMembershipCard(
  client: CardClient,
  member: MemberForCard
): Promise<{ card: MembershipCard; existing: boolean }> {
  const existingCard = await client.membershipCard.findFirst({
    where: {
      memberId: member.id,
      status: {
        in: [...ACTIVE_CARD_STATUSES],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (existingCard) {
    return { card: existingCard, existing: true };
  }

  const card = await client.membershipCard.create({
    data: {
      cardNumber: generateCardNumber(),
      barcode: generateBarcode(),
      memberId: member.id,
      expiryDate: member.expiryDate,
      status: 'ACTIVE',
    },
  });

  await client.member.update({
    where: { id: member.id },
    data: {
      cardIssued: true,
      cardGeneratedAt: new Date(),
    },
  });

  return { card, existing: false };
}
