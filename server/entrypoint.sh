#!/bin/bash

bunx prisma migrate deploy
bunx prisma db seed

exec node dist/index.js