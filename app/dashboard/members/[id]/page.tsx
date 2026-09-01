import { MemberDetailsClient } from '@/components/members/MemberDetailsClient';

export default function MemberDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return <MemberDetailsClient memberId={params.id} />;
}
