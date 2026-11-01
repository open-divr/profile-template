#!/usr/bin/env bash
# Uploads the built profile (or, after a failed build, the end of the build log) to the platform, then waits for
# its verdict. Authentication is this run's GitHub OIDC token, fetched fresh for every request; the platform runs
# its own checks on everything it receives.
#
# The platform checks uploads in a queue. The upload asks it to wait up to 20 s for the outcome: the answer is then
# the outcome itself (201 ready, 422 rejected), or 202 with "status":"pending" when the upload is still queued, in
# which case this script polls GET /v1/deploy/<id> until the upload is ready, rejected or failed (at most 10
# minutes). The job fails unless the upload went live: it passes too when the upload went live and another
# deployment (a newer upload, a rollback) has replaced it since, and fails when a choice made on the config page after it arrived (a
# rollback, the gallery) kept it from going live.
#
# An upload or failure report is sent again, up to 5 times, only when a second try may pass: no answer (no
# connection, a timeout), 408, 500, 502, 503, 504, or a 429 rate limit, which carries Retry-After; the next try
# waits at least that long. A 429 without Retry-After is the account's daily deploy limit and, like any other
# 4xx, is the platform's verdict: it fails the job at once with the platform's message. Polling goes on through no
# answer, a 429 or a 5xx (waiting at least the Retry-After it carries), and fails on any other refusal.
set -euo pipefail
API_URL="${API_URL:-https://divr.space}"
POLL_LIMIT_SECONDS="${POLL_LIMIT_SECONDS:-600}"
POLL_EVERY_SECONDS="${POLL_EVERY_SECONDS:-5}"
SEND_RETRIES="${SEND_RETRIES:-5}"

oidc_token() {
  curl -sSf -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
    "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${API_URL}" | jq -r .value
}

# Prints the platform's answer; a refusal (4xx/5xx: the error JSON or the rejection report) fails the job.
show_or_fail() {
  local rc=$1
  cat response.json 2>/dev/null || true
  echo
  if [ "${rc}" -ne 0 ]; then exit 1; fi
}

# The queue standing of a pending answer in response.json.
show_standing() {
  jq -r 'if .position == 0 then "being checked" else "queued: position \(.position), about \(.estimatedWaitSeconds) s" end' response.json
}

# The Retry-After (in seconds) of the last answer, from headers.txt; empty when it had none.
retry_after() {
  if [ -f headers.txt ]; then tr -d '\r' < headers.txt | sed -n 's/^[Rr]etry-[Aa]fter: *\([0-9][0-9]*\)$/\1/p' | tail -n 1; fi
}

# POSTs to $1 with the rest as curl arguments and a fresh OIDC token each try; the answer is left in response.json
# and its HTTP status (000 for none) in $code. Tries again only as the note at the top of this script says.
post_with_retry() {
  local url=$1
  shift
  local try=0 backoff=1 token pause_s
  while :; do
    rm -f response.json headers.txt
    if token=$(oidc_token); then
      code=$(curl -sS --max-time 120 -o response.json -D headers.txt -w '%{http_code}' \
        -H "Authorization: Bearer ${token}" "$@" "${url}") || code=000
    else
      echo "could not fetch an OIDC token" >&2
      code=000
    fi
    case "${code}" in
      000 | 408 | 500 | 502 | 503 | 504) pause_s=$(retry_after) ;;
      429)
        pause_s=$(retry_after)
        if [ -z "${pause_s}" ]; then return 0; fi
        ;;
      *) return 0 ;;
    esac
    if [ "${try}" -ge "${SEND_RETRIES}" ]; then return 0; fi
    try=$((try + 1))
    if [ -z "${pause_s}" ] || [ "${pause_s}" -lt "${backoff}" ]; then pause_s="${backoff}"; fi
    echo "the platform did not take the request (HTTP ${code}); trying again (${try} of ${SEND_RETRIES}) in ${pause_s} s" >&2
    sleep "${pause_s}"
    backoff=$((backoff * 2))
  done
}

if [ "${BUILD_RESULT}" = "success" ]; then
  tar -czf bundle.tar.gz -C dist .
  # The source archive travels with the bundle when the build job produced one; the platform keeps it for the
  # owner and offers it to forkers while the owner allows forks.
  source_part=()
  if [ -f source/source.tar.gz ]; then source_part=(-F "source=@source/source.tar.gz;type=application/gzip"); fi
  # A retried upload of the same run is recognised by the platform and answered with the same deployment.
  post_with_retry "${API_URL}/v1/deploy" \
    -H "Prefer: wait=20" \
    -F "bundle=@bundle.tar.gz;type=application/gzip" \
    "${source_part[@]}"
  case "${code}" in
    2??) ;;
    *) show_or_fail 1 ;;
  esac
  deploy_id=$(jq -r .deployId response.json)
  status=$(jq -r .status response.json)
  deadline=$((SECONDS + POLL_LIMIT_SECONDS))
  polled=0
  pause="${POLL_EVERY_SECONDS}"
  if [ "${status}" = "pending" ]; then show_standing; fi
  while [ "${status}" = "pending" ]; do
    if [ "${SECONDS}" -ge "${deadline}" ]; then
      echo "deployment ${deploy_id} is still queued after $((POLL_LIMIT_SECONDS / 60)) minutes; its outcome will show on the config page" >&2
      exit 1
    fi
    sleep "${pause}"
    pause="${POLL_EVERY_SECONDS}"
    if ! token=$(oidc_token); then
      echo "could not fetch a fresh OIDC token; polling again" >&2
      continue
    fi
    rm -f response.json headers.txt
    # No answer, a 429 or a 5xx: the platform is restarting or busy, so keep polling until the limit, no sooner than
    # its Retry-After (in seconds). Any other answer but 200 is a refusal and fails the job.
    code=$(curl -sS --max-time 30 -o response.json -D headers.txt -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      "${API_URL}/v1/deploy/${deploy_id}") || code=000
    case "${code}" in
      200)
        polled=1
        status=$(jq -r .status response.json)
        if [ "${status}" = "pending" ]; then show_standing; fi
        ;;
      000 | 429 | 5??)
        asked=$(retry_after)
        if [ -n "${asked}" ] && [ "${asked}" -gt "${pause}" ]; then pause="${asked}"; fi
        # Never past the poll limit: the check at the top of the loop ends the job there.
        if [ "${pause}" -gt $((deadline - SECONDS)) ]; then pause=$((deadline - SECONDS > 0 ? deadline - SECONDS : 0)); fi
        echo "the platform did not answer (HTTP ${code}); polling again in ${pause} s" >&2
        ;;
      *)
        show_or_fail 1
        ;;
    esac
  done
  if [ "${polled}" -eq 1 ]; then show_or_fail 0; fi
  # Rejected: the report's findings say why. Failed in the queue: buildLogTail says why.
  if [ "${status}" != "ready" ]; then
    echo "deployment ${deploy_id} is ${status}; the previous version stays live" >&2
    exit 1
  fi
  if [ "$(jq -r .live response.json)" = "true" ]; then
    echo "deployment ${deploy_id} is live"
  elif [ "$(jq -r .activation response.json)" = "activated" ]; then
    # Went live when it finished; another deployment (a newer upload, a rollback) is live now.
    echo "deployment ${deploy_id} went live; another deployment has replaced it since"
  else
    # Never went live: the live profile was chosen on the config page (a rollback, the gallery) after this upload
    # arrived, and that choice stands.
    echo "deployment ${deploy_id} passed its checks but never went live: the live profile was chosen after it arrived" >&2
    exit 1
  fi
else
  if [ -f build-log/build.log ]; then tail -c 65536 build-log/build.log > tail.log
  else echo "build failed before producing a log" > tail.log; fi
  post_with_retry "${API_URL}/v1/deploy/failure" -F "log=@tail.log;type=text/plain"
  show_or_fail 1
fi
