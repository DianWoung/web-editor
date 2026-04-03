type FetchDeviceRuntime = (deviceId: string, options?: { force?: boolean }) => Promise<unknown>

export function createDeviceDetailPollTask(fetchDeviceRuntime: FetchDeviceRuntime, deviceId: string) {
  return async () => {
    await fetchDeviceRuntime(deviceId, { force: true })
  }
}
