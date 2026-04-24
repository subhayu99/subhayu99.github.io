/**
 * Configuration Module Exports
 *
 * Centralized export point for all configuration modules.
 * Import configs using: import { terminalConfig, uiText, apiConfig, socialConfig, storageConfig, storage } from '@/config';
 */

export { terminalConfig, getPromptString } from './terminal.config';
export { uiText, formatMessage } from './ui.config';
export { apiConfig, getEndpointUrl, fetchWithTimeout } from './api.config';
export { socialConfig, getSocialNetworkUrl } from './social.config';
export { storageConfig, storage } from './storage.config';
export { guiTheme, accentHex, accentHoverHex, accentRgbStr, accentRgba, accentRgbCss, getAccentRgb, colorThemes, applyColorTheme, getSavedTheme, cycleTheme } from './gui-theme.config';
export type { ColorTheme } from './gui-theme.config';
export { tuiVars, tuiColor, tuiRhythm, tuiText, tuiChrome, tuiClass } from './tui-tokens';
