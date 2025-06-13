import { type ApproveDeviceInput, approveDeviceInputSchema } from "@shared/input/device";
import { useFormik } from "formik";
import { useState } from "react";
import z from "zod";
import { trpc } from "../utils/trpc";
import DeviceApproveAdvancedForm from "./DeviceApproveAdvancedForm";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-xs">
          Approve Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={approveFormik.handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Approve Device</DialogTitle>
            <DialogDescription>
              Approve the device with ID <strong>{deviceId}</strong> and PIN <strong>{pin}</strong>.
              You can also configure SSH and VNC settings.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="device-name">Device Name:</Label>

          <Input
            type="text"
            name="name"
            id="device-name"
            placeholder="Enter device name"
            required
            value={approveFormik.values.name}
            onChange={approveFormik.handleChange}
            className="border rounded p-2 w-full"
          />

          {approveFormik.errors.name && (
            <div className="text-red-500 text-sm">{approveFormik.errors.name}</div>
          )}

          <Label className="flex items-center gap-2">
            <Checkbox
              name="vncEnabled"
              checked={approveFormik.values.vncEnabled || false}
              onCheckedChange={checked => {
                approveFormik.setFieldValue("vncEnabled", !!checked);
              }}
              className="h-4 w-4"
            />
            Enable VNC Server
          </Label>

          {approveFormik.values.vncEnabled && (
            <>
              <Label>
                Vnc server password
                <Input
                  type="password"
                  name="vncServerPassword"
                  required
                  value={approveFormik.values.vncServerPassword}
                  onChange={approveFormik.handleChange}
                  className="border rounded p-2 w-full"
                />
              </Label>

              {approveFormik.errors.vncServerPassword && (
                <div className="text-red-500 text-sm">{approveFormik.errors.vncServerPassword}</div>
              )}
            </>
          )}

          <Button variant="secondary" onClick={() => setAdvanced(!advanced)}>
            {advanced ? "Hide Advanced Options" : "Show Advanced Options"}
          </Button>

          {advanced && <DeviceApproveAdvancedForm formik={approveFormik} />}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button
              type="submit"
              disabled={approveMutation.isPending}
              loading={approveMutation.isPending}
            >
              Approve Device
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceApproveForm;
