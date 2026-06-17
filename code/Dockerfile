FROM python:3.12-slim

WORKDIR /app

COPY backend ./backend
COPY static ./static
COPY templates ./templates

ENV PYTHONPATH=/app

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt \
       -f https://download.pytorch.org/whl/cpu/torch_stable.html

EXPOSE 80

COPY start_services.sh /app/start_services.sh
RUN chmod +x /app/start_services.sh

CMD ["/app/start_services.sh"]
