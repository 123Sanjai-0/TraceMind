#!/bin/bash
set -e

# Change to script directory
cd "$(dirname "$0")"

echo "================================================="
echo " Starting TraceMind AI Observability Platform"
echo "================================================="

# 1. Activate Python virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r backend/requirements.txt
fi

# 2. Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
fi

# 3. Start Backend in background
echo "Starting FastAPI Backend on http://127.0.0.1:8000 ..."
PYTHONPATH=backend ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 4. Start Frontend in background
echo "Starting React Vite Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 5173) &
FRONTEND_PID=$!

echo ""
echo " TraceMind is now running!"
echo " • Web Application Dashboard: http://localhost:5173"
echo " • FastAPI OpenAPI Documentation: http://127.0.0.1:8000/docs"
echo ""
echo "Press [CTRL+C] to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT INT TERM
wait
