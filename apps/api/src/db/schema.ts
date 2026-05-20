import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const users = pgTable('users', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email:      text('email').unique().notNull(),
  name:       text('name'),
  avatarUrl:  text('avatar_url'),
  password:   text('password').notNull(), // bcrypt hash, never plaintext
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),            // random string, not UUID
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ─────────────────────────────────────────────
// BOOKMARKS
// ─────────────────────────────────────────────
export const bookmarks = pgTable('bookmarks', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url:            text('url').notNull(),
  title:          text('title'),
  description:    text('description'),
  screenshotUrl:  text('screenshot_url'),
  faviconUrl:     text('favicon_url'),
  ogImageUrl:     text('og_image_url'),
  isArchived:     boolean('is_archived').default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Index on userId + createdAt — your most common query pattern
  // "get my bookmarks, newest first"
  userCreatedIdx: index('idx_bookmarks_user_created').on(table.userId, table.createdAt),
}))

// ─────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────
export const tags = pgTable('tags', {
  id:      uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:  uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:    text('name').notNull(),
  color:   text('color'),
})

// ─────────────────────────────────────────────
// BOOKMARK ↔ TAG (junction table)
// ─────────────────────────────────────────────
export const bookmarkTags = pgTable('bookmark_tags', {
  bookmarkId: uuid('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  tagId:      uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.bookmarkId, table.tagId] }),
}))

// ─────────────────────────────────────────────
// RELATIONS (tells Drizzle how to join)
// ─────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  bookmarks: many(bookmarks),
  tags:      many(tags),
  sessions:  many(sessions),
}))

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  user:         one(users, { fields: [bookmarks.userId], references: [users.id] }),
  bookmarkTags: many(bookmarkTags),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user:         one(users, { fields: [tags.userId], references: [users.id] }),
  bookmarkTags: many(bookmarkTags),
}))

export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
  bookmark: one(bookmarks, { fields: [bookmarkTags.bookmarkId], references: [bookmarks.id] }),
  tag:      one(tags,      { fields: [bookmarkTags.tagId],      references: [tags.id] }),
}))
