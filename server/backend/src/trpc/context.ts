import type { FastifyRequest } from "fastify";

export async function createContext({ req }: { req: FastifyRequest }) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return {
    req,
    token,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
