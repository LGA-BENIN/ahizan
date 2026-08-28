'use server';

import { removeAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function logoutAction() {
    await removeAuthToken();
    redirect('/sign-in');
}
