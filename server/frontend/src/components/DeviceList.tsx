import type { Connection } from "@/context/connection.ctx";
import type { Dispatch, SetStateAction } from "react";
import type { Device } from "../utils/trpc";
import DeviceListItem from "./DeviceListItem";

interface Props {
  devices: Device[];
  setActiveConnection: Dispatch<SetStateAction<Connection | null>>;
}

const DeviceList = ({ devices,setActiveConnection }: Props) => {
  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No devices found</p>
        <p className="text-xs mt-1">Waiting for devices to register</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map(device => (
        <DeviceListItem setActiveConnection={setActiveConnection} key={device.id} device={device} />
      ))}
    </div>
  );
};

export default DeviceList;
