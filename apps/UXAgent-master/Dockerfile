FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy ALL project files (uv sync needs source for hatchling version resolution)
COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/
COPY conf/ ./conf/

# Install dependencies (source must exist for hatchling to resolve version)
RUN uv sync --frozen --no-dev

# Note: Playwright browser NOT installed - using BrowserBase for remote sessions
# For local mode, uncomment: RUN uv run playwright install chromium

# Default port for Flask
ENV PORT=8000

EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/progress || exit 1

# Run the Flask API server with gunicorn for production
CMD ["uv", "run", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "300", "src.simulated_web_agent.main.app:app"]
