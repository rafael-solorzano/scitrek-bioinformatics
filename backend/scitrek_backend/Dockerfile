FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN addgroup --system scitrek \
    && adduser --system --ingroup scitrek --home /app scitrek \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R scitrek:scitrek /app/media /app/staticfiles

COPY --chown=scitrek:scitrek . .
COPY --chmod=0755 entrypoint.sh /entrypoint.sh

USER scitrek

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "scitrek_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-", "--error-logfile", "-", "--capture-output"]
