import { type ApproveDeviceInput, approveDeviceInputSchema } from "@shared/input/device";
import { useFormik } from "formik";
import { useState } from "react";
import z from "zod";
import { trpc } from "../utils/trpc";
import DeviceApproveAdvancedForm from "./DeviceApproveAdvancedForm";

interface Props {
  deviceId: string;
  pin: string;
}

const DeviceApproveForm = ({ deviceId, pin }: Props) => {
  const [advanced, setAdvanced] = useState<boolean>(false);

  const approveMutation = trpc.admin.device.approve.useMutation();
  const approveFormik = useFormik<ApproveDeviceInput>({
    initialValues: {
      deviceId,
      vncEnabled: false,
      vncServerPassword: "",
      name: "",
    },
    validate: values => {
      try {
        approveDeviceInputSchema.parse(values);
      } catch (err) {
        if (err instanceof z.ZodError) {
          const result: Record<string, string> = {};

          for (const key in err.flatten().fieldErrors) {
            result[key] = err.flatten().fieldErrors[key]?.join(", ") || "";
          }

          return result;
        }
      }
    },
    onSubmit: values => {
      approveMutation.mutate(values);
    },
  });

  return (
    <form onSubmit={approveFormik.handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Approve Device</h2>
      <strong>PIN: {pin}</strong>

      <label>
        Device Name:
        <input
          type="text"
          name="name"
          required
          value={approveFormik.values.name}
          onChange={approveFormik.handleChange}
          className="border rounded p-2 w-full"
        />
      </label>

      {approveFormik.errors.name && (
        <div className="text-red-500 text-sm">{approveFormik.errors.name}</div>
      )}

      <label className="flex items-center gap-2">
        <input type="checkbox" 
          name="vncEnabled"
          checked={approveFormik.values.vncEnabled || false}
          onChange={approveFormik.handleChange}
          className="h-4 w-4"
        />
        Enable VNC Server
      </label>

      {approveFormik.values.vncEnabled && (
        <>
          <label>
            Vnc server password
            <input
              type="password"
              name="vncServerPassword"
              required
              value={approveFormik.values.vncServerPassword}
              onChange={approveFormik.handleChange}
              className="border rounded p-2 w-full"
            />
          </label>

          {approveFormik.errors.vncServerPassword && (
            <div className="text-red-500 text-sm">{approveFormik.errors.vncServerPassword}</div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setAdvanced(!advanced)}
        className="text-white hover:underline"
      >
        {advanced ? "Hide Advanced Options" : "Show Advanced Options"}
      </button>

      {advanced && <DeviceApproveAdvancedForm formik={approveFormik} />}

      <button
        type="submit"
        disabled={approveMutation.isPending}
        className="text-white rounded p-2 hover:bg-blue-700 disabled:bg-gray-400"
      >
        {approveMutation.isPending ? "Approving..." : "Approve Device"}
      </button>
    </form>
  );
};

export default DeviceApproveForm;
