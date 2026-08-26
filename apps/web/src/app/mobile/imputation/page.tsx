import { redirect } from 'next/navigation';
import MobileTimeEntrySimulator from '@/components/MobileTimeEntrySimulator';
import { getSessionUser } from '@/server/auth';
import { UserRole } from '@/types';

export const metadata = {
  title: 'Imputation mobile — JAMAE Project',
  description: 'Prévisualisation mobile sécurisée des imputations Jamaé Project'
};

export default async function MobileImputationPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <MobileTimeEntrySimulator
      currentUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        active: user.active
      }}
    />
  );
}
