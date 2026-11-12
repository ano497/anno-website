#!/usr/bin/env bash
# Renders episodes one after another: ./queue.sh 02 03 04
cd "$(dirname "$0")"
for e in "$@"; do ./render.sh "$e" > render$e.log 2>&1 || echo "FAILED $e" >> render$e.log; done
echo queue-done
