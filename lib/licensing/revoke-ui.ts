export function patchLicenseListRevoked<T extends { id: string; status: string; activeDevices?: number }>(
  rows: T[],
  licenseId: string,
): T[] {
  return rows.map((row) =>
    row.id === licenseId ? { ...row, status: "revoked", activeDevices: 0 } : row,
  );
}

export function patchUserLicenseDeviceRevoked<
  T extends { devices: { id: string; revoked_at: string | null }[] },
>(rows: T[], deviceId: string, revokedAt: string): T[] {
  return rows.map((license) => ({
    ...license,
    devices: license.devices.map((device) =>
      device.id === deviceId ? { ...device, revoked_at: revokedAt } : device,
    ),
  }));
}