const GUAC_URL = process.env.GUAC_URL || "";
const GUAC_USER = process.env.GUAC_USER || "";
const GUAC_PASS = process.env.GUAC_PASSWORD || "";

interface Connection {
  identifier: string;
  name: string;
  parentIdentifier: string;
  protocol: string;
  parameters: Record<string, string>;
  attributes: Record<string, string | null>;
  activeConnections?: number;
}

export async function getToken(): Promise<{ authToken: string; dataSource: string }> {
  console.log(`Fetching Guacamole token from ${GUAC_URL}/api/tokens`);
  const res = await fetch(`${GUAC_URL}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: GUAC_USER,
      password: GUAC_PASS,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get token: ${res.statusText}`);
  }

  const data = await res.json();

  const auth = { authToken: data.authToken, dataSource: data.dataSource };

  return auth;
}

export async function createGuacConnection(
  deviceId: string,
  port: number,
  hostname = process.env.SSH_LISTENER_HOST || "localhost",
): Promise<{ identifier: string }> {
  const { authToken, dataSource } = await getToken();

  console.log(`Creating Guacamole connection for device ${deviceId} on port ${port}`);

  const connection = {
    parentIdentifier: "ROOT",
    name: `SSH ${deviceId}`,
    protocol: "ssh",
    parameters: {
      port: port.toString(),
      hostname,
      "read-only": "",
      "swap-red-blue": "",
      cursor: "",
      "color-depth": "",
      "force-lossless": "",
      "clipboard-encoding": "",
      "disable-copy": "",
      "disable-paste": "",
      "dest-port": "",
      "recording-exclude-output": "",
      "recording-exclude-mouse": "",
      "recording-include-keys": "",
      "create-recording-path": "",
      "enable-sftp": "",
      "sftp-port": "",
      "sftp-server-alive-interval": "",
      "sftp-disable-download": "",
      "sftp-disable-upload": "",
      "enable-audio": "",
      "wol-send-packet": "",
      "wol-udp-port": "",
      "wol-wait-time": "",
      "color-scheme": "",
      "font-size": "",
      scrollback: "",
      "server-alive-interval": "",
      backspace: "",
      "terminal-type": "",
      "create-typescript-path": "",
    },
    attributes: {
      "max-connections": "",
      "max-connections-per-user": "",
      weight: "",
      "failover-only": "",
      "guacd-port": "",
      "guacd-encryption": "",
      "guacd-hostname": "",
    },
  };

  const listRes = await fetch(`${GUAC_URL}/api/session/data/${dataSource}/connections`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Guacamole-Token": authToken,
      "Content-Type": "application/json",
    },
  });

  const existingConnections: Record<string, Connection> = await listRes.json();

  const existing = Object.values(existingConnections).find(
    (conn: { identifier: string; name: string }) => conn.name === connection.name,
  );

  if (existing) {
    console.warn(`Connection for device ${deviceId} already exists: ${existing.identifier}`);

    return { identifier: existing.identifier };
  }

  const res = await fetch(`${GUAC_URL}/api/session/data/${dataSource}/connections`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Guacamole-Token": authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connection),
  });

  if (!res.ok) {
    throw new Error(`Failed to create connection to guacamole: ${await res.text()}`);
  }

  const connId = await res.json();
  connId.token = authToken;
  return connId;
}

export async function deleteGuacConnection(connectionId: string): Promise<void> {
  const { authToken, dataSource } = await getToken();

  const res = await fetch(
    `${GUAC_URL}/api/session/data/${dataSource}/connections/${connectionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Guacamole-Token": authToken,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to delete connection ${connectionId}: ${res.statusText}`);
  }

  console.log(`✅ Connection ${connectionId} deleted successfully.`);
}
