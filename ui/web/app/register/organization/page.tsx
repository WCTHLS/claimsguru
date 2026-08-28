import type { Metadata } from 'next';
import { RegisterOrganization } from '@/components/claimgpt/register-organization';

export const metadata: Metadata = {
  title: 'Add an Organization | ClaimsGuru',
  description: 'Register your TPA or insurer organization to manage and review claims on ClaimsGuru.',
};

export default function RegisterOrganizationPage() {
  return <RegisterOrganization />;
}