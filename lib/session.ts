import 'server-only';
import { cookies } from 'next/headers';

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set('session', userId, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;

  if (!userId) {
    return { isAuth: false, userId: null };
  }

  return { isAuth: true, userId };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
