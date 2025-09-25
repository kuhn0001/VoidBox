# Use official Python base
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Use gunicorn binding to $PORT provided by platform
ENV PORT=8080
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:$PORT", "app:app"]