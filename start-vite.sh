#!/bin/bash
cd /home/iteam/radio-lineup-generator-rtl-78
export PORT=5173
export NODE_ENV=production
# Use serve to serve built files with SPA routing support
# The --single flag serves index.html for all routes (SPA mode)
exec serve dist -p 5173 -l 5173 --single

