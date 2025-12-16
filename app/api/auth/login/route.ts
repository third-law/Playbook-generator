import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // For development, simple password check
    if (password === 'admin') {
      await createSession();
      return NextResponse.json({ success: true });
    }
    
    // Try with hash if available
    const passwordHash = process.env.SHARED_PASSWORD_HASH;
    if (passwordHash && passwordHash.length > 20) { // Valid hash should be longer
      const isValid = await verifyPassword(password, passwordHash);
      if (isValid) {
        await createSession();
        return NextResponse.json({ success: true });
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}