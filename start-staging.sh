#!/bin/bash
cd /home/iteam/radio-lineup-generator-rtl-78
export PORT=5175
export NODE_ENV=development
# Run Vite dev server on port 5175
exec npx vite --port 5175 --host 0.0.0.0
