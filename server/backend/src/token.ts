import jwt from "jsonwebtoken";

const JWT_DEVICE_SECRET = process.env.JWT_DEVICE_SECRET || "your_dev_secret"; // Replace in prod
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || "your_dev_admin_secret"; // Replace in prod

export function validateDeviceToken(token: string | null): string | null {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_DEVICE_SECRET) as {
      deviceId: string;
    };
    return payload.deviceId ?? null;
  } catch (err) {
    console.warn("[auth] Invalid JWT:", err);
    return null;
  }
}

export function generateDeviceToken(deviceId: string): string {
  const payload = { deviceId };
  // never expire
  return jwt.sign(payload, JWT_DEVICE_SECRET, { expiresIn: "1000y" });
}

export function validateAdminToken(token: string | null): boolean {
  if (!token) return false;

  try {
    jwt.verify(token, JWT_ADMIN_SECRET);
    return true;
  } catch (err) {
    console.warn("[auth] Invalid JWT:", err);
    return false;
  }
}

export function generateAdminToken(userId: string): string {
  return jwt.sign(
    {
      userId,
    },
    JWT_ADMIN_SECRET,
    { expiresIn: "7d" },
  ); // 7 days
}
