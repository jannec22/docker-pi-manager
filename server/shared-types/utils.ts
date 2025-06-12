import { z } from "zod";

// export interface VncServerParams {
//     password?: string;
//     display?: string;
//     colorDepth?: "8" | "16" | "24" | "32";
//     cursor?: "remote" | "local" | "none";
//     enableClipboard?: boolean;
//     readOnly?: boolean;
// }

// export interface VncClientParams {
//     password?: string;
//     scaleMode?: "fit" | "auto" | "stretch" | "none";
//     cursor?: "remote" | "local" | "none";
//     readOnly?: boolean;	
//     compression?: number;
// }

export interface TunnelInfo {
  remote: number;
  local: number;
  user: string;
  host: string;
  pid: number;
}

export const vncServerParamsSchema = z.object({
    display: z.number().optional(),
    colorDepth: z.enum(["8", "16", "24", "32"]).optional(),
    cursor: z.enum(["remote", "local", "none"]).optional(),
    enableClipboard: z.boolean().optional(),
    readOnly: z.boolean().optional(),
});

export const vncClientParamsSchema = z.object({
    scaleMode: z.enum(["fit", "auto", "stretch", "none"]).optional(),
    cursor: z.enum(["remote", "local", "none"]).optional(),
    readOnly: z.boolean().optional(),
    compression: z.number().optional(),
});

export type VncServerParams = z.infer<typeof vncServerParamsSchema>;
export type VncClientParams = z.infer<typeof vncClientParamsSchema>;