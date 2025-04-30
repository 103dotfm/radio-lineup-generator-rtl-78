
interface ShowDisplayResult {
  displayName: string;
  displayHost: string;
  backgroundColor?: string;
  textColor?: string;
}

export const getShowDisplay = (showName: string, hostName?: string): ShowDisplayResult => {
  if (!hostName || showName === hostName) {
    return { 
      displayName: showName, 
      displayHost: '', 
      backgroundColor: '#f3f4f6', // default light gray background
      textColor: '#111827'        // default dark text
    };
  }
  return { 
    displayName: showName, 
    displayHost: hostName,
    backgroundColor: '#f3f4f6', // default light gray background
    textColor: '#111827'        // default dark text
  };
};

export const getCombinedShowDisplay = (showName: string, hostName?: string) => {
  if (!hostName || showName === hostName) {
    return showName;
  }
  return `${showName} עם ${hostName}`;
};
