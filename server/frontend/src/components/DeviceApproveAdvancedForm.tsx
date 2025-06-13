import type { ApproveDeviceInput } from "@shared/input/device";
import type { FormikProps } from "formik";
import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface Props {
  formik: FormikProps<ApproveDeviceInput>;
}

const DeviceApproveAdvancedForm = ({ formik }: Props) => {
  const [useKeyForSsh, setUseKeyForSsh] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="use-key-for-ssh" className="text-sm font-medium text-gray-700">
          <Checkbox
            id="use-key-for-ssh"
            checked={useKeyForSsh}
            onCheckedChange={checked => {
              setUseKeyForSsh(!!checked);
            }}
          />
          Use key for SSH
        </Label>
      </div>

      {useKeyForSsh && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sshPrivateKey" className="text-sm font-medium text-gray-700">
              SSH Private Key
            </Label>
            <Textarea
              name="privateKey"
              id="sshPrivateKey"
              rows={4}
              onBlur={formik.handleBlur}
              value={formik.values.privateKey}
              onChange={formik.handleChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sshPrivateKeyPassphrase" className="text-sm font-medium text-gray-700">
              SSH Private Key Passphrase
            </Label>
            <Input
              type="password"
              name="privateKeyPassphrase"
              id="sshPrivateKeyPassphrase"
              onBlur={formik.handleBlur}
              value={formik.values.privateKeyPassphrase}
              onChange={formik.handleChange}
              className="border rounded p-2 w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DeviceApproveAdvancedForm;
