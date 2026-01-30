# Multilingual Support with LingUI

This project now supports multiple languages using [LingUI](https://lingui.dev/), a powerful internationalization framework for React and Next.js.

## Supported Languages

- **Russian (ru)** - Default language
- **English (en)**

## How It Works

### 1. URL-based Language Routing

The application uses Next.js App Router with locale-based routing. All pages are under the `[locale]` dynamic segment:

```
/ru/          # Russian homepage
/en/          # English homepage
/ru/research  # Russian research page
/en/research  # English research page
```

### 2. Automatic Language Detection

When users visit the root URL (`/`), the middleware automatically:
- Detects the user's preferred language from browser settings (Accept-Language header)
- Redirects them to the appropriate locale (defaults to Russian)

### 3. Language Switcher

A language switcher component is available in the sidebar, allowing users to switch between Russian and English at any time.

## Adding Translations

### Using Trans Component (for JSX content)

```tsx
import { Trans } from '@lingui/react';

<h1>
  <Trans id="page.title">Page Title</Trans>
</h1>
```

### Using msg/t Macro (for strings)

```tsx
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';

const { _ } = useLingui();

const buttonLabel = _(msg`Click me`);
```

## Workflow for Adding New Translations

1. **Add translations in your code** using `Trans` or `msg`/`t`:

```tsx
<Trans id="welcome.message">Welcome to our app</Trans>
```

2. **Extract messages** from the codebase:

```bash
pnpm i18n:extract
```

This command scans your code and updates the message catalogs in `src/locales/{locale}/messages.po`.

3. **Translate messages** in the `.po` files:

**src/locales/ru/messages.po:**
```po
msgid "welcome.message"
msgstr "Добро пожаловать в наше приложение"
```

**src/locales/en/messages.po:**
```po
msgid "welcome.message"
msgstr "Welcome to our app"
```

4. **Compile the messages**:

```bash
pnpm i18n:compile
```

This generates the compiled JavaScript catalogs that the app uses at runtime.

## File Structure

```
apps/research-web/
├── src/
│   ├── app/
│   │   ├── [locale]/          # All pages under locale routing
│   │   │   ├── layout.tsx     # Locale-specific layout
│   │   │   ├── page.tsx       # Homepage
│   │   │   └── ...
│   │   └── layout.tsx         # Root layout (Clerk provider)
│   ├── lib/
│   │   ├── i18n.ts            # i18n configuration
│   │   ├── i18n-provider.tsx  # Client-side i18n provider
│   │   ├── set-i18n.ts        # Server-side i18n setup
│   │   └── locale-detector.ts # Browser language detection
│   ├── locales/
│   │   ├── en/
│   │   │   ├── messages.po    # English translations (editable)
│   │   │   └── messages.js    # Compiled catalog (auto-generated)
│   │   └── ru/
│   │       ├── messages.po    # Russian translations (editable)
│   │       └── messages.js    # Compiled catalog (auto-generated)
│   ├── components/
│   │   └── LanguageSwitcher.tsx  # Language switcher component
│   └── middleware.ts          # Handles locale routing + auth
├── lingui.config.ts           # LingUI configuration
└── next.config.ts             # Next.js config with SWC plugin
```

## Configuration

### lingui.config.ts

```typescript
const config: LinguiConfig = {
  locales: ["ru", "en"],
  sourceLocale: "ru",
  fallbackLocales: {
    default: "ru",
  },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: "po",
};
```

### next.config.ts

The Next.js configuration includes the LingUI SWC plugin for macro transformations:

```typescript
experimental: {
  swcPlugins: [["@lingui/swc-plugin", {}]],
},
webpack: (config) => {
  config.module.rules.push({
    test: /\.po$/,
    use: "@lingui/loader",
  });
  return config;
},
```

## Best Practices

1. **Always provide explicit IDs** for Trans components to avoid extraction issues:
   ```tsx
   <Trans id="unique.id">Text</Trans>
   ```

2. **Use msg macro for dynamic strings**:
   ```tsx
   const status = _(msg`Processing...`);
   ```

3. **Run extract and compile** after adding new translations:
   ```bash
   pnpm i18n:extract && pnpm i18n:compile
   ```

4. **Keep Russian as the source language** since it's the default locale.

## Adding a New Language

1. Add the locale to `lingui.config.ts`:
   ```typescript
   locales: ["ru", "en", "es"],  // Add Spanish
   ```

2. Add it to `src/lib/i18n.ts`:
   ```typescript
   export const locales = ["ru", "en", "es"] as const;
   ```

3. Run extract to create the new catalog:
   ```bash
   pnpm i18n:extract
   ```

4. Translate messages in `src/locales/es/messages.po`

5. Compile:
   ```bash
   pnpm i18n:compile
   ```

## Resources

- [LingUI Documentation](https://lingui.dev/)
- [LingUI Next.js App Router Tutorial](https://lingui.dev/tutorials/react-rsc)
- [LingUI CLI Reference](https://lingui.dev/ref/cli)
