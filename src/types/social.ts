export type InterestItemView = {
  slug: string;
  name: string;
  categorySlug: string;
};

export type InterestCategoryView = {
  slug: string;
  name: string;
  interests: InterestItemView[];
};

export type InterestCatalogView = {
  categories: InterestCategoryView[];
};

export type UserInterestSettingsView = {
  selectedSlugs: string[];
  limit: 10;
};

export type GroupDiscoveryProfileView = {
  primaryCategorySlug: string | null;
  topicSlugs: string[];
  language: string;
  region: string | null;
  topicLimit: 5;
};
