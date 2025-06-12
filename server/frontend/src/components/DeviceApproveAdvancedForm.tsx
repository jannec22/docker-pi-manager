import type { ApproveDeviceInput } from "@shared/input/device";
import type { FormikProps } from "formik";
import { useState } from "react";

interface Props {
  formik: FormikProps<ApproveDeviceInput>;
}

const DeviceApproveAdvancedForm = ({ formik }: Props) => {
  const [useKeyForSsh, setUseKeyForSsh] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="use-key-for-ssh" className="text-sm font-medium text-gray-700">
          Use key for SSH
        </label>
        <input
          type="checkbox"
          id="use-key-for-ssh"
          checked={useKeyForSsh}
          onChange={e => setUseKeyForSsh(e.target.checked)}
        />
      </div>

      {useKeyForSsh && (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="sshPrivateKey" className="text-sm font-medium text-gray-700">
              SSH Private Key
            </label>
            <textarea
              name="privateKey"
              id="sshPrivateKey"
              rows={4}
              onBlur={formik.handleBlur}
              value={formik.values.privateKey}
              onChange={formik.handleChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="sshPrivateKeyPassphrase" className="text-sm font-medium text-gray-700">
              SSH Private Key Passphrase
            </label>
            <input
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
