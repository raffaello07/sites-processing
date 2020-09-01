export interface Site {
  id?: number;
  designerVersionId: number;
  regionId: number;
  name: string;
  url: string;
  city: string;
  state: string;
  domain?: string;
  legacySiteId: string | null;
  createdAt?: string;
  updatedAt?: string;
  validationOutput?: LayoutMatchResult[] | null;
  enabled?: boolean;
  isObitImageMappingEnabled?: boolean;
}

export interface LayoutMatchResult {
  designerMatch: boolean;
  designerMatchDetails: string;
  layoutSelectorsMatch: boolean;
  layoutSelectorsMatchDetails: string;
  designerVersionId: number;
  fullMatch: boolean;
}

export interface RawSite {
  name: string;
  domain: string;
}
