# Claude Development Notes

## Import Organization Style Guide

### Import Comment Categories

Always organize imports with proper comment headers and spacing:

```typescript
// ** import types
import type { TypeName, AnotherType } from '@/types/module'

// ** import utils
import { utilFunction } from 'wxt/utils/module'

// ** import lib
import { LibClass } from '@/lib/module'
import { AnotherClass } from './localModule'

// ** import apis
import { apiFunction } from '@/api/module'

// ** import constants
import { CONSTANT_VALUE } from './constants'

// ** import styles
import '@/entrypoints/style.css'
```

### Rules

1. **Always add 1 line space** between different import sections
2. **Use exact comment format**: `// ** import [category]`
3. **Group related imports** under the same comment section
4. **Order from abstract to concrete**: types → utils → lib → apis → constants → styles
5. **No additional descriptive text** in comments - just the category name

### Categories

- `// ** import types` - TypeScript type imports only
- `// ** import utils` - Utility functions and helpers  
- `// ** import lib` - Library/class imports from local modules
- `// ** import apis` - API-related imports
- `// ** import constants` - Constant/configuration imports
- `// ** import styles` - CSS/style imports

### Examples

✅ **Good:**
```typescript
// ** import types
import type { FormField } from '@/types/extension'

// ** import lib
import { ElementUtils } from './elementUtils'
import { SoundManager } from '@/lib/utils/soundManager'
```

❌ **Bad:**
```typescript
import type { FormField } from '@/types/extension'
import { ElementUtils } from './elementUtils'
import { SoundManager } from '@/lib/utils/soundManager'
```

❌ **Bad:**
```typescript
// ** import types
import type { FormField } from '@/types/extension'
// ** import lib utilities
import { ElementUtils } from './elementUtils'
```

This pattern ensures consistent, readable import organization across the entire codebase.