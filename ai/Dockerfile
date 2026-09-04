# The analyst service.
#
# One image that runs anywhere a container runs: Render, Fly.io, a VPS, Railway.
# The service is deliberately NOT serverless-friendly and must be hosted as a
# long-lived process:
#
#   * a run holds an SSE stream open for minutes (measured: ~380s end to end),
#     which is longer than most function timeouts allow;
#   * run state lives in process, so the approval endpoint has to reach the
#     same instance that is streaming the run.
#
# For the same reason, run ONE instance. Behind several replicas an approval
# can land on a replica that is not running the analysis; the failure is
# visible rather than silent, but it is still a failure.

FROM python:3.11-slim

# Fail fast and log straight through, so a crash loop is readable in the host's
# log viewer instead of buffered into silence.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

# Dependencies first, so a code change does not reinstall them.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Hosts inject the port. 8000 is only the local default.
ENV PORT=8000
EXPOSE 8000

# Run as a non-root user: nothing here needs write access.
RUN useradd --create-home --uid 10001 analyst && chown -R analyst /srv
USER analyst

# A single worker on purpose: see the note about in-process run state above.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 75"]
