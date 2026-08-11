import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  store: text("store").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  oldPrice: real("old_price").notNull(),
  coupon: text("coupon"),
  imageUrl: text("image_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  badge: text("badge"),
  verifiedAt: text("verified_at").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_deals_active_updated").on(table.active, table.updatedAt), index("idx_deals_category").on(table.category)]);
