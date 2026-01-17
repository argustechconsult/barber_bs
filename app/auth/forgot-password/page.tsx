'use client';

import { useRouter } from 'next/navigation';
import ForgotPasswordScreen from '../../../src/modules/auth/ForgotPasswordScreen';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return <ForgotPasswordScreen onBackToLogin={() => router.push('/')} />;
}
