import type { Locale, Messages } from "@ep/i18n";

// Compile-time checked translation keys across the whole app.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
