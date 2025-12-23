import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * 
 * @param html - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (html: string, options?: DOMPurify.Config): string => {
  if (!html) return '';
  
  // Default configuration for safe HTML
  const defaultConfig: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'a', 'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'href', 'target', 'rel',
      'id', 'title', 'alt', 'dir', 'lang'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: [
      'script', 'object', 'embed', 'form', 'input', 'textarea',
      'select', 'option', 'button', 'iframe', 'frame', 'frameset'
    ],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
      'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange',
      'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow',
      'onpopstate', 'onresize', 'onstorage', 'oncontextmenu'
    ]
  };

  // Merge with custom options
  const config = { ...defaultConfig, ...options };
  
  try {
    return DOMPurify.sanitize(html, config);
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    // Return empty string on error to prevent XSS
    return '';
  }
};

/**
 * Sanitizes HTML for display in show details (more permissive)
 */
export const sanitizeShowDetails = (html: string): string => {
  return sanitizeHTML(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'a', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'href', 'target', 'rel',
      'id', 'title', 'alt', 'dir', 'lang',
      'colspan', 'rowspan', 'align', 'valign'
    ]
  });
};

/**
 * Sanitizes HTML for email content (very restrictive)
 */
export const sanitizeEmailContent = (html: string): string => {
  return sanitizeHTML(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'a'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'href', 'target', 'rel'
    ]
  });
};

/**
 * Sanitizes HTML for notes (moderate restrictions)
 */
export const sanitizeNotes = (html: string): string => {
  return sanitizeHTML(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'id', 'title', 'dir', 'lang'
    ]
  });
};

/**
 * Sanitizes HTML for credits (moderate restrictions)
 */
export const sanitizeCredits = (html: string): string => {
  return sanitizeHTML(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'div', 'span', 'blockquote'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'id', 'title', 'dir', 'lang'
    ]
  });
};
