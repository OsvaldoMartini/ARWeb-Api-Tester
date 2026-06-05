import type Database from 'better-sqlite3';
import type { BusinessCategory, BusinessSubcategory } from '@arweb/domain';
import type { TaxonomyRepository } from '@arweb/application';

// ── Row shapes ───────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string; name: string; description: string | null; keywords: string; ord: number;
}
interface SubcategoryRow {
  id: string; category_id: string; name: string; keywords: string; ord: number;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SqliteTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly db: Database.Database) {}

  async listCategories(): Promise<BusinessCategory[]> {
    const rows = this.db
      .prepare('SELECT * FROM business_categories ORDER BY ord')
      .all() as CategoryRow[];
    return rows.map(toCategory);
  }

  async listSubcategories(categoryId?: string): Promise<BusinessSubcategory[]> {
    const rows = categoryId
      ? (this.db.prepare('SELECT * FROM business_subcategories WHERE category_id = ? ORDER BY ord').all(categoryId) as SubcategoryRow[])
      : (this.db.prepare('SELECT * FROM business_subcategories ORDER BY ord').all() as SubcategoryRow[]);
    return rows.map(toSubcategory);
  }

  async seedIfEmpty(categories: BusinessCategory[], subs: BusinessSubcategory[]): Promise<void> {
    const count = (this.db.prepare('SELECT COUNT(*) as n FROM business_categories').get() as { n: number }).n;
    if (count > 0) return;

    const upsertCat = this.db.prepare(
      'INSERT OR IGNORE INTO business_categories (id,name,description,keywords,ord) VALUES (?,?,?,?,?)',
    );
    const upsertSub = this.db.prepare(
      'INSERT OR IGNORE INTO business_subcategories (id,category_id,name,keywords,ord) VALUES (?,?,?,?,?)',
    );

    this.db.transaction(() => {
      for (const c of categories) {
        upsertCat.run(c.id, c.name, c.description, JSON.stringify(c.keywords), c.order);
      }
      for (const s of subs) {
        upsertSub.run(s.id, s.categoryId, s.name, JSON.stringify(s.keywords), s.order);
      }
    })();
  }

  async setEndpointCategory(endpointId: string, categoryId: string | null): Promise<void> {
    this.db
      .prepare('UPDATE api_endpoints SET category_id = ? WHERE id = ?')
      .run(categoryId, endpointId);
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toCategory(r: CategoryRow): BusinessCategory {
  return {
    id: r.id, name: r.name, description: r.description,
    keywords: JSON.parse(r.keywords) as string[],
    order: r.ord,
  };
}

function toSubcategory(r: SubcategoryRow): BusinessSubcategory {
  return {
    id: r.id, categoryId: r.category_id, name: r.name,
    keywords: JSON.parse(r.keywords) as string[],
    order: r.ord,
  };
}
