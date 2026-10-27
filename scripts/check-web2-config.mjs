// Run: node --env-file=.env.local scripts/check-web2-config.mjs
// Only verifies environment consistency; does not connect to Firebase, R2 or GitHub.
const env = process.env;
const errors = [];
const warnings = [];
const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_FIREBASE_DATABASE_URL','FIREBASE_PROJECT_ID',
  'FIREBASE_DATABASE_URL','FIREBASE_SERVICE_ACCOUNT_JSON','AMORRI_ADMIN_UIDS',
  'R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY',
  'DRIVE_SERVICE_ACCOUNT_JSON','DRIVE_VIDEO_SIGNING_SECRET'
];
for(const k of required) if(!env[k]?.trim()) errors.push(`Missing ${k}`);
if(env.FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.FIREBASE_PROJECT_ID!==env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) errors.push('Firebase server/client project IDs differ');
if(env.FIREBASE_DATABASE_URL && env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && env.FIREBASE_DATABASE_URL.replace(/\/+$/,'')!==env.NEXT_PUBLIC_FIREBASE_DATABASE_URL.replace(/\/+$/,'')) errors.push('Firebase server/client database URLs differ');
if([env.FIREBASE_PROJECT_ID,env.NEXT_PUBLIC_FIREBASE_PROJECT_ID].includes('ammori-c4905')) errors.push('Firebase points to the ORIGINAL Amorri project');
if([env.FIREBASE_DATABASE_URL,env.NEXT_PUBLIC_FIREBASE_DATABASE_URL].some(x=>x?.includes('ammori-c4905'))) errors.push('Database URL points to original Amorri');
if(env.R2_BUCKET==='amorri-private-videos') errors.push('Video R2 bucket points to original Amorri');
if(env.R2_CONCEPT_BUCKET==='amorri-concept-photos') errors.push('Concept R2 bucket points to original Amorri');
if(env.AMORRI_GITHUB_ACTIONS_REPOSITORY==='tandatges-afk/AmorriStudio') errors.push('GitHub Actions still points to original Amorri repository');
if(env.NEXT_PUBLIC_GITHUB_REPOSITORY==='tandatges-afk/AmorriStudio') errors.push('GitHub UI link still points to original repository');
if(env.NEXT_PUBLIC_GITHUB_REPOSITORY && env.AMORRI_GITHUB_ACTIONS_REPOSITORY && env.NEXT_PUBLIC_GITHUB_REPOSITORY!==env.AMORRI_GITHUB_ACTIONS_REPOSITORY) errors.push('GitHub UI repository and workflow dispatch repository differ');
if(env.FIREBASE_SERVICE_ACCOUNT_JSON){
 try {
  const sa=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if(!sa.project_id||!sa.client_email||!sa.private_key) errors.push('Firebase service account missing required fields');
  if(sa.project_id && env.FIREBASE_PROJECT_ID && sa.project_id!==env.FIREBASE_PROJECT_ID) errors.push('Firebase service account project differs from target project');
  if(sa.project_id==='ammori-c4905') errors.push('Firebase service account belongs to original Amorri');
 } catch { errors.push('Firebase service account is not valid single-line JSON'); }
}
if(!/^[a-fA-F0-9]{32}$/.test(env.R2_ACCOUNT_ID||'')) errors.push('R2_ACCOUNT_ID must be 32 hex digits');
if(!env.R2_CONCEPT_BUCKET||!env.R2_CONCEPT_ACCESS_KEY_ID||!env.R2_CONCEPT_SECRET_ACCESS_KEY) warnings.push('Concept photo R2 bucket/credentials not configured');
if(!env.AMORRI_GITHUB_ACTIONS_REPOSITORY) warnings.push('GitHub Actions immediate dispatch is disabled until new repository is configured');
if(!env.DRIVE_SERVICE_ACCOUNT_JSON) warnings.push('Drive-based video functionality will not work');
if(!env.AMORRI_ARCHIVE_ENCRYPTION_KEY) warnings.push('Archive encryption key not configured');
for(const msg of errors) console.error('[ERROR]',msg);
for(const msg of warnings) console.warn('[WARN]',msg);
if(errors.length){console.error('STOP: fix the errors before deploying. No credentials were printed.');process.exitCode=1;}
else console.log('Config consistency checks passed. Live Firebase/R2 access has NOT been tested.');
