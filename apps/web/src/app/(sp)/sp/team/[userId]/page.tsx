import { redirect } from 'next/navigation';

export default async function SpTeamUserRedirectPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/sp/organization/${userId}`);
}
