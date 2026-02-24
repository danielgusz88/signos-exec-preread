import { NextResponse } from 'next/server';
import { testModeConnection } from '@/lib/integrations/mode';

export async function GET() {
  try {
    const result = await testModeConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
