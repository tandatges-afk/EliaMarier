import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Public, non-sensitive release marker: used only to distinguish an old deployment. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Élia Marier — VPS Self-Hosted',
    release: 'drive-302-pilot-20261013-r1',
    upgradeRelease: 'availability-money-302-auto-20261013-r1',
    authApi: 'diagnostic-codes-enabled',
    deliveryApi: 'capability-tokens-enabled',
    streamingApi: 'nginx-x-accel-private-1080p',
    privateVideoRelease: 'vps-signed-media-20261101',
    autoVideoSyncRelease: 'vps-local-worker-20261101',
    currentRelease: 'elia-marier-vps-migration-beta',
    privateVideoMode: 'vps-private',
    systemDiagnostics: 'admin-only',
    time: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
