#!/usr/bin/env bash
# Re-download the 8 source photographs into ./images-source/.
# Outputs are at 1920w; run `npm run images` afterwards to regenerate
# the AVIF/WebP/JPG variants in public/images/.
set -e

cd "$(dirname "$0")/.."
mkdir -p images-source
cd images-source

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

DL() {
  local url="$1" out="$2"
  echo "→ $out"
  curl -sL -A "$UA" -o "$out" "$url"
  ls -l "$out" | awk '{printf "  %s bytes\n", $5}'
}

# Pexels — direct CDN with w=1920
DL "https://images.pexels.com/photos/17882001/pexels-photo-17882001.jpeg?auto=compress&cs=tinysrgb&w=1920" hero-altbau.jpg
DL "https://images.pexels.com/photos/18909542/pexels-photo-18909542.jpeg?auto=compress&cs=tinysrgb&w=1920" domain-a-aerial.jpg
DL "https://images.pexels.com/photos/30633929/pexels-photo-30633929.jpeg?auto=compress&cs=tinysrgb&w=1920" trust-pen.jpg

# Unsplash — capture the 302 Location, append &w=1920, then download.
DL_UNSPLASH() {
  local id="$1" out="$2"
  local target
  target=$(curl -sI -A "$UA" "https://unsplash.com/photos/${id}/download?force=true" \
    | awk '/^[Ll]ocation:/ {gsub(/\r/,""); print $2}' | head -1)
  if [[ -z "$target" ]]; then
    echo "  ! redirect failed for $id"
    return 1
  fi
  echo "  resolved → ${target:0:80}…"
  DL "${target}&w=1920" "$out"
}

DL_UNSPLASH 4nDEdZZjaQQ problem-scaffolding.jpg
DL_UNSPLASH sAlWjm2huck threestep-blueprint.jpg
DL_UNSPLASH Jye5NmDCwGU domain-b-facade.jpg
DL_UNSPLASH c6D7fHnQ-2U domain-c-heritage.jpg
DL_UNSPLASH rEVhEQOy5QA finalcta-windows.jpg

ls -lh
