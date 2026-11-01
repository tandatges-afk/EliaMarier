import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Public, non-sensitive release marker: used only to distinguish an old deployment. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Élia Marier V5 — Firebase Auth + RTDB + Operations',
    release: 'drive-302-pilot-20261013-r1',
    upgradeRelease: 'availability-money-302-auto-20261013-r1',
    authApi: 'diagnostic-codes-enabled',
    deliveryApi: 'capability-tokens-enabled',
    streamingApi: 'r2-only-1080p-signed-url-no-vercel-video',
    privateVideoRelease: 'r2-signed-private-20261013-r1',
    autoVideoSyncRelease: 'r2-auto-worker-20261014-r1',
    currentRelease: 'elia-marier-v5-firebase-restored-staging',
    privateVideoMode: 'r2-only',
    systemDiagnostics: 'admin-only',
    time: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
