import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adobeSignEnabled =
    process.env.ADOBE_SIGN_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_ADOBE_SIGN_ENABLED === 'true';

  return NextResponse.json({ adobeSignEnabled });
}
