export const UPSTREAM_TEMPLATE_REPO: string;
export const UPSTREAM_TEMPLATE_URL: string;

export interface TemplateConfig {
  version: string;
  isUpstream: boolean;
  site: {
    title: string;
    description: string;
    author: string;
    language: string;
    repoUrl: string;
    siteUrl: string;
    templateRepo: string;
    templateRepoUrl: string;
    templateForkUrl: string;
  };
  docs: {
    easyMode: string;
    advanced: string;
    upgrading: string;
    troubleshooting: string;
    renderCv: string;
  };
  tracking: {
    signature: boolean;
  };
}

export function loadTemplateConfig(): TemplateConfig;
export function renderTemplateConfigModule(config: TemplateConfig): string;
export function renderSignatureComment(config: TemplateConfig): string;
