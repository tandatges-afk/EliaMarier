#!/usr/bin/env bash
# Non-destructive copy: never delete originals. Requires configured rclone R2 remote.
set -euo pipefail
MEDIA_ROOT="${ELIA_MEDIA_ROOT:-/srv/elia/media}"
R2_REMOTE="${R2_REMOTE:-r2}"
VIDEO_BUCKET="${R2_VIDEO_BUCKET:-elia-marier-private-videos}"
PHOTO_BUCKET="${R2_PHOTO_BUCKET:-elia-marier-concept-photos}"
if [[ "${1:-}" != "--apply" ]]; then
 echo 'DRY-RUN, use --apply when media root and bucket configuration have been verified.'
 flags=(--dry-run)
else flags=(); fi
command -v rclone >/dev/null || { echo 'rclone missing';exit 1; }
mkdir -p "$MEDIA_ROOT"
chmod 750 "$MEDIA_ROOT"
for bucket in "$VIDEO_BUCKET" "$PHOTO_BUCKET"; do
 echo "Copying ${R2_REMOTE}:${bucket} -> ${MEDIA_ROOT} (keeping object key paths)"
 rclone copy "${R2_REMOTE}:${bucket}" "$MEDIA_ROOT" --progress --transfers 2 --checkers 4 "${flags[@]}"
done
if [[ "${1:-}" == "--apply" ]];then
 echo 'Verifying object listings/sizes. For cryptographic verification, use rclone check --download (high transfer cost).'
 for bucket in "$VIDEO_BUCKET" "$PHOTO_BUCKET";do
  rclone check "${R2_REMOTE}:${bucket}" "$MEDIA_ROOT" --one-way --size-only
 done
 echo 'Copies verified by file sizes. Keep R2 until application cutover and full functional checks.'
fi
