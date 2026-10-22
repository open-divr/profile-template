#!/usr/bin/env bash
# Uploads the built profile (or, after a failed build, the end of the build log) to the platform.
# Authentication is this run's GitHub OIDC token; the platform runs its own checks on everything it receives.
set -euo pipefail
API_URL="${API_URL:-https://divr.space}"

oidc_token() {
  curl -sSf -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
    "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${API_URL}" | jq -r .value
}

if [ "${BUILD_RESULT}" = "success" ]; then
  tar -czf bundle.tar.gz -C dist .
  # The source archive travels with the bundle when the build job produced one; the platform stores it only
  # while the owner allows forks.
  source_part=()
  if [ -f source/source.tar.gz ]; then source_part=(-F "source=@source/source.tar.gz;type=application/gzip"); fi
  curl -sS --fail-with-body --retry 5 --retry-all-errors --max-time 120 \
    -H "Authorization: Bearer $(oidc_token)" \
    -F "bundle=@bundle.tar.gz;type=application/gzip" \
    "${source_part[@]}" \
    "${API_URL}/v1/deploy"
else
  if [ -f build-log/build.log ]; then tail -c 65536 build-log/build.log > tail.log
  else echo "build failed before producing a log" > tail.log; fi
  curl -sS --fail-with-body --retry 5 --retry-all-errors --max-time 60 \
    -H "Authorization: Bearer $(oidc_token)" \
    -F "log=@tail.log;type=text/plain" \
    "${API_URL}/v1/deploy/failure"
  exit 1
fi
