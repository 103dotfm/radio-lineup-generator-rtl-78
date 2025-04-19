
export const getShowDisplay = (showName: string, hostName?: string) => {
  if (!hostName || showName === hostName) {
    return { displayName: showName, displayHost: '' };
  }
  return { displayName: showName, displayHost: hostName };
};

export const getCombinedShowDisplay = (showName: string, hostName?: string) => {
  if (!hostName || showName === hostName) {
    return showName;
  }
  return `${showName} עם ${hostName}`;
};

