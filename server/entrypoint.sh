#!/bin/bash

npx prisma migrate deploy
npx prisma db seed

exec node dist/index.js