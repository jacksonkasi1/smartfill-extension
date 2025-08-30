# SmartFill Extension CSS Architecture

## Overview
The CSS has been refactored from a single `style.css` file into a modular architecture with multiple organized files for better maintainability.

## File Structure

```
src/styles/
├── index.css          # Main entry point that imports all other files
├── variables.css      # CSS custom properties and design tokens
├── base.css          # Reset styles, base typography, scrollbars
├── layout.css        # Container layouts, grid systems, utilities
├── header.css        # Header, navigation, logo styles
├── settings.css      # Settings modal and related components
├── auth.css          # Authentication components and user profile
├── buttons.css       # All button variants and states
├── forms.css         # Input fields, textareas, checkboxes
├── status.css        # Status messages, notifications, alerts
├── recording.css     # Recording section specific styles
├── sessions.css      # Sessions list and session items
└── animations.css    # Keyframes, transitions, loading states
```

## Import Order
The CSS files are imported in a specific order in `index.css` to ensure proper cascade:

1. **variables.css** - Design tokens (must be first)
2. **base.css** - Reset and base styles
3. **layout.css** - Layout containers and utilities
4. **Component files** - All component-specific styles
5. **animations.css** - Animations (last to allow overrides)

## Key Classes Preserved

### Layout & Structure
- `.container` - Main container
- `.page-content` - Page content wrapper
- `.header` - Main header
- `.actions-row` - Action button grid

### Settings
- `.settings-modal` - Settings overlay
- `.settings-content` - Settings content wrapper
- `.setting-group` - Setting group container
- `.setting-description` - Setting descriptions

### Authentication
- `.auth-section` - Auth container
- `.auth-status` - Auth status indicator
- `.user-profile-modal` - User profile modal
- `.user-avatar-small` - Small user avatar

### Buttons
- `.primary-btn` - Primary action buttons
- `.secondary-btn` - Secondary action buttons
- `.save-btn` - Save buttons
- `.export-btn`, `.import-btn` - Export/import buttons

### Forms
- `.input-group` - Input field groups
- `.main-prompt-textarea` - Main prompt textarea
- `.checkbox-label` - Checkbox labels
- `.file-input-label` - File input labels

### Status & Messages
- `.status` - Status messages
- `.key-status` - API key status
- `.export-status`, `.import-status` - Operation status

### Recording
- `.recording-section` - Recording container
- `.recording-status` - Recording status
- `.record-btn`, `.stop-btn` - Recording buttons

### Sessions
- `.sessions-list` - Sessions container
- `.session-item` - Individual session items
- `.session-actions` - Session action buttons

## Global Control
All global styles and design tokens are centralized in `variables.css`, making it easy to maintain consistent theming across the entire application.

## Usage
Import the main styles file in your components:
```javascript
import "./styles/index.css"
```

## Maintenance Notes
- Keep the import order in `index.css`
- Add new component styles to appropriate files
- Update variables in `variables.css` for global changes
- Use semantic class names following existing patterns