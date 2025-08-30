export function getFieldSelectors(): string[] {
  return [
    // Traditional form elements
    'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
    'input[type="tel"]', 'input[type="url"]', 'input[type="search"]',
    'input:not([type])',
    
    'input[type="number"]', 'input[type="range"]',
    'input[type="date"]', 'input[type="datetime-local"]', 'input[type="time"]',
    'input[type="month"]', 'input[type="week"]',
    
    'input[type="checkbox"]', 'input[type="radio"]',
    'select',
    
    'textarea', 'input[type="color"]', 'input[type="file"]',
    
    // Modern UI components - Date pickers
    'button[class*="date"]', 'button[class*="picker"]', 'button[class*="calendar"]',
    'button[aria-label*="date" i]', 'button[aria-label*="calendar" i]',
    'div[class*="date"][role="button"]', 'div[class*="picker"][role="button"]',
    
    // Modern UI components - Custom dropdowns
    'button[class*="select"]', 'button[class*="dropdown"]', 'button[class*="choose"]',
    'button[aria-expanded]', 'button[aria-haspopup="listbox"]',
    'div[class*="select"][role="button"]', 'div[class*="dropdown"][role="button"]',
    
    // Modern UI components - File uploads
    'button[class*="upload"]', 'button[class*="attach"]', 'button[class*="browse"]',
    'button[aria-label*="upload" i]', 'button[aria-label*="attach" i]',
    'div[class*="upload"][role="button"]', 'div[class*="file"][role="button"]',
    
    // ARIA-based interactive form elements
    '[role="combobox"]', '[role="listbox"]', '[role="textbox"]',
    '[role="button"][aria-expanded]', '[contenteditable="true"]',
    '[data-testid*="input"]', '[data-testid*="select"]', '[data-testid*="field"]'
  ]
}

export function getModernUISelectors(): string[] {
  return [
    // Date picker patterns
    'button:contains("Select date")', 'button:contains("Choose date")',
    'button[class*="date"]:not(input)', 'button[class*="picker"]:not(input)',
    
    // Custom dropdown patterns  
    'button:contains("Select")', 'button:contains("Choose")',
    'button[aria-expanded]', 'div[role="button"][class*="select"]',
    
    // File upload patterns
    'button:contains("Upload")', 'button:contains("Attach")', 'button:contains("Browse")',
    'label[for] button', 'div[class*="upload"][role="button"]'
  ]
}