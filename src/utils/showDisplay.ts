
export const getShowDisplay = (showName: string, hostName?: string) => {
  if (!hostName || showName === hostName) {
    return { displayName: showName, displayHost: '' };
  }
  return { displayName: showName, displayHost: hostName };
};
