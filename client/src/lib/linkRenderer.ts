// Simple link storage for click handling
const linkStore = new Map<string, string>();

// Utility to render markdown-style links and make them clickable
export function renderLinks(content: string): string {
  // Skip processing if content already contains link markers
  if (content.includes('🔗')) {
    return content;
  }

  // Replace markdown links [text](url) with simple spans
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let rendered = content.replace(markdownLinkRegex, (match, text, url) => {
    const linkId = Math.random().toString(36).substr(2, 9);
    linkStore.set(linkId, url);
    return `<span class="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer" data-link="${linkId}">${text}</span>`;
  });

  // Replace bare URLs with clickable spans
  const urlRegex = /(?<!href=['"])(https?:\/\/[^\s<>"']+)/g;
  rendered = rendered.replace(urlRegex, (url) => {
    const linkId = Math.random().toString(36).substr(2, 9);
    linkStore.set(linkId, url);
    return `<span class="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer" data-link="${linkId}">${url}</span>`;
  });

  // Replace email addresses with mailto links
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  rendered = rendered.replace(emailRegex, (email) => {
    const linkId = Math.random().toString(36).substr(2, 9);
    linkStore.set(linkId, `mailto:${email}`);
    return `<span class="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer" data-link="${linkId}">${email}</span>`;
  });

  // // Replace phone numbers with tel: links
  // const phoneRegex = /\+\d{11,13}}/g;
  // rendered = rendered.replace(phoneRegex, (phone) => {
  //   const linkId = Math.random().toString(36).substr(2, 9);
  //   linkStore.set(linkId, `tel:${phone}`);
  //   return `<span class="text-terminal-bright-green hover:underline hover:text-terminal-yellow cursor-pointer" data-link="${linkId}">${phone}</span>`;
  // });

  return rendered;
}

// Function to get link URL by ID
export function getLinkUrl(linkId: string): string | undefined {
  return linkStore.get(linkId);
}

// Enhanced HTML content renderer that processes links and improves formatting
export function enhanceContent(content: string): string {
  // First render links
  let enhanced = renderLinks(content);
  
  // Improve command formatting - make commands more visible
  enhanced = enhanced.replace(/`([^`]+)`/g, '<span class="bg-terminal-green/20 text-terminal-bright-green px-1 rounded">$1</span>');
  
  // Enhance section headers with better spacing and visibility
  enhanced = enhanced.replace(/^(\s*)(#+)\s*(.+)$/gm, (match, indent, hashes, title) => {
    const level = hashes.length;
    const color = level === 1 ? 'text-terminal-bright-green' : 'text-terminal-green';
    return `${indent}<span class="${color} font-bold text-lg">${title}</span>`;
  });
  
  return enhanced;
}