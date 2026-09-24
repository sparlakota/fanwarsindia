/**
 * FanWarsIndia — inline SVG icon set.
 * Replaces platform emoji (which render inconsistently and read as "app template")
 * with a single consistent line-icon system in brand colors.
 */

const Icons = {
  flame: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 6 8.5 7.8 8.5 11.5C8.5 13.5 9.8 14.5 9.8 14.5C9.8 14.5 8.5 13.8 8.5 12C6.8 13.5 6 15.3 6 17C6 20 8.7 22 12 22C15.3 22 18 20 18 17C18 12.5 14.5 11.8 14.8 8C14.8 8 16 9.5 16 11.5C17 10 17.2 8 16.2 6C15.5 8 14 8.5 14 8.5C15 5.5 13.5 3 12 2Z" fill="currentColor"/>
    </svg>`,

  crowd: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.8"/>
      <path d="M2.5 20C2.5 16 5 13.5 8 13.5C11 13.5 13.5 16 13.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M14.5 14C17.2 14 19.5 16.3 19.5 19.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  close: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  back: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  whatsapp: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.5 2 2 6.5 2 12C2 13.9 2.5 15.7 3.5 17.2L2 22L7 20.6C8.4 21.4 10.2 21.9 12 21.9C17.5 21.9 22 17.4 22 11.9C22 6.4 17.5 2 12 2ZM12 20C10.4 20 8.9 19.6 7.6 18.8L7.3 18.6L4.3 19.4L5.1 16.5L4.9 16.2C4 14.8 3.6 13.4 3.6 12C3.6 7.4 7.4 3.6 12 3.6C16.6 3.6 20.4 7.4 20.4 12C20.4 16.6 16.6 20 12 20ZM16.5 14.2C16.3 14.1 15 13.5 14.8 13.4C14.6 13.3 14.4 13.3 14.3 13.5C14.1 13.7 13.6 14.3 13.4 14.5C13.3 14.7 13.1 14.7 12.9 14.6C12.1 14.2 11.4 13.7 10.8 13.1C10.3 12.6 9.8 12 9.5 11.3C9.4 11.1 9.5 10.9 9.6 10.8C9.7 10.7 9.9 10.5 10 10.3C10.1 10.2 10.2 10 10.1 9.8C10 9.7 9.6 8.4 9.4 7.9C9.2 7.4 9.1 7.5 9 7.5C8.9 7.5 8.7 7.5 8.5 7.5C8.3 7.5 8 7.6 7.8 7.8C7.5 8.1 6.9 8.6 6.9 9.9C6.9 11.2 7.8 12.5 7.9 12.7C8.1 12.9 9.8 15.6 12.4 16.6C14.4 17.4 14.8 17.2 15.3 17.2C15.8 17.1 16.9 16.5 17.1 15.9C17.4 15.3 17.4 14.8 17.3 14.7C17.2 14.6 17 14.5 16.5 14.2Z"/>
    </svg>`,

  x: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.2 3H21.5L14.3 11.2L22.8 21H16.1L10.9 14.4L4.9 21H1.6L9.3 12.3L1.2 3H8.1L12.8 9L18.2 3ZM17 19H18.9L7.1 4.9H5.1L17 19Z"/>
    </svg>`,

  instagram: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/>
    </svg>`,

  link: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 14.5L14.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M11 6.5L12.2 5.3C13.6 3.9 15.9 3.9 17.3 5.3C18.7 6.7 18.7 9 17.3 10.4L16.1 11.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M13 17.5L11.8 18.7C10.4 20.1 8.1 20.1 6.7 18.7C5.3 17.3 5.3 15 6.7 13.6L7.9 12.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  star: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L14.6 8.9L21 9.6L16.2 13.9L17.6 20.2L12 17L6.4 20.2L7.8 13.9L3 9.6L9.4 8.9L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`,

  share: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15V3M12 3L7.5 7.5M12 3L16.5 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 12V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  download: (cls = "") => `
    <svg viewBox="0 0 24 24" class="${cls}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3V15M12 15L7.5 10.5M12 15L16.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M4 18V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
};
