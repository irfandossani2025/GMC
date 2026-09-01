import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api
  * Health check endpoint — confirms the API is reachable.
   */
export async function GET() {
	  return NextResponse.json({
		      status: 'ok',
		      service: 'GMC Clinic Membership API',
		      timestamp: new Date().toISOString(),
	  });
}