export interface ListingCard {
  id: string; slug: string; title: string; price: number | null; priceNegotiable: boolean; currency: string;
  city: string; region: string; condition: string | null; offerType: string; image: string | null; createdAt: number;
  categorySlug: string; parentCategorySlug: string; categoryName: string; verified: boolean; isTop: boolean; highlighted: boolean;
  status: string; distanceKm?: number;
}
export interface FilterDef { key: string; label: string; type: 'select' | 'multiselect' | 'range' | 'boolean'; options?: string[]; unit?: string; min?: number; max?: number }
export interface Category { id: string; slug: string; name: string; icon: string; count: number; filters: FilterDef[]; seoTitle?: string; seoDescription?: string; children: { id: string; slug: string; name: string; count: number; filters: FilterDef[]; seoTitle?: string; seoDescription?: string }[] }
export interface SearchResult { hits: ListingCard[]; total: number; page: number; pages: number; facets: Record<string, Record<string, number>>; recognized: string[]; engine: string }
