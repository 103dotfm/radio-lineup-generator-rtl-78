
export const getShowDisplay = (slot: any) => {
  // Determine colors based on show properties
  let backgroundColor = '#4a72e8'; // Default blue
  let textColor = '#ffffff';       // Default white
  
  if (slot.color) {
    backgroundColor = `var(--${slot.color})`;
    // Determine if we need a dark or light text based on background brightness
    // For simplicity, we're using a fixed text color based on known background colors
    textColor = ['yellow', 'lime', 'amber', 'orange', 'green-light'].includes(slot.color) 
      ? '#000000' // Dark text for light backgrounds
      : '#ffffff'; // Light text for dark backgrounds
  }

  const showName = slot.show_name || '';
  const hostName = slot.host_name || '';
  
  if (!hostName || showName === hostName) {
    return { 
      displayName: showName, 
      displayHost: '',
      backgroundColor,
      textColor
    };
  }
  
  return { 
    displayName: showName, 
    displayHost: hostName,
    backgroundColor,
    textColor
  };
};

export const getCombinedShowDisplay = (showName: string, hostName?: string) => {
  if (!hostName || showName === hostName) {
    return showName;
  }
  return `${showName} עם ${hostName}`;
};
