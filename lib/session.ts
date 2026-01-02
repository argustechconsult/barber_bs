import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    return { isAuth: false, userId: null };
  }

  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    });
    return { isAuth: true, userId: payload.userId as string };
  } catch (error) {
    console.log('Failed to verify session');
    return { isAuth: false, userId: null };
  }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
