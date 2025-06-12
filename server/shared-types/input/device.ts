import { z } from "zod";
import { vncClientParamsSchema, vncServerParamsSchema } from "../utils";

// export interface ApproveDeviceInput {
//   deviceId: string;
//   name: string & typia.tags.MinLength<3>;
//   localSshPort?: number;
//   localVncPort?: number;
//   vncServerParams?: VncServerParams;
//   vncClientParams?: VncServerParams;
//   privateKey?: string;
//   privateKeyPassphrase?: string;
// }

export const approveDeviceInputSchema = z.object({
  deviceId: z.string(),
  name: z.string().min(3),
  localSshPort: z.number().optional(),
  localVncPort: z.number().optional(),
  vncEnabled: z.boolean(),
  vncServerPassword: z.string(),
  vncServerParams: vncServerParamsSchema.optional(),
  vncClientParams: vncClientParamsSchema.optional(),
  privateKey: z.string().optional(),
  privateKeyPassphrase: z.string().optional(),
});

export type ApproveDeviceInput = z.infer<typeof approveDeviceInputSchema>;
