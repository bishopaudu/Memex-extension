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
  username:   text('username').unique(),
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
  screenshotKey: text('screenshot_key'),
  faviconUrl:     text('favicon_url'),
  ogImageUrl:     text('og_image_url'),
  isArchived:     boolean('is_archived').default(false),
  isPublic:       boolean('is_public').default(false),
  publicSlug:     text('public_slug').unique(),
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
  user:                one(users, { fields: [bookmarks.userId], references: [users.id] }),
  bookmarkTags:        many(bookmarkTags),
  bookmarkCollections: many(bookmarkCollections),
  attachments:         many(attachments),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user:         one(users, { fields: [tags.userId], references: [users.id] }),
  bookmarkTags: many(bookmarkTags),
}))

export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
  bookmark: one(bookmarks, { fields: [bookmarkTags.bookmarkId], references: [bookmarks.id] }),
  tag:      one(tags,      { fields: [bookmarkTags.tagId],      references: [tags.id] }),
}))

// ─────────────────────────────────────────────
// COLLECTIONS
// ─────────────────────────────────────────────
export const collections = pgTable('collections', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  color:       text('color').default('#4f6ef7'),
  icon:        text('icon').default('📁'),
  isPublic:    boolean('is_public').default(false),
  slug:        text('slug'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ─────────────────────────────────────────────
// BOOKMARK ↔ COLLECTION (many-to-many)
// ─────────────────────────────────────────────
export const bookmarkCollections = pgTable('bookmark_collections', {
  bookmarkId:   uuid('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  addedAt:      timestamp('added_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.bookmarkId, table.collectionId] }),
}))

// Relations
export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user:                one(users, { fields: [collections.userId], references: [users.id] }),
  bookmarkCollections: many(bookmarkCollections),
}))

export const bookmarkCollectionsRelations = relations(bookmarkCollections, ({ one }) => ({
  bookmark:   one(bookmarks,   { fields: [bookmarkCollections.bookmarkId],   references: [bookmarks.id] }),
  collection: one(collections, { fields: [bookmarkCollections.collectionId], references: [collections.id] }),
}))

// ─────────────────────────────────────────────
// ATTACHMENTS
// A bookmark can have multiple attachments
// Each has a type: screenshot | area_screenshot | text | image
// ─────────────────────────────────────────────
export const attachmentTypeEnum = ['screenshot', 'area_screenshot', 'text', 'image'] as const
export type  AttachmentType     = typeof attachmentTypeEnum[number]

export const attachments = pgTable('attachments', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bookmarkId: uuid('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(),           // 'screenshot' | 'area_screenshot' | 'text' | 'image'
  content:    text('content'),                  // text content for text attachments
  url:        text('url'),                      // cloudinary URL for image/screenshot attachments
  storageKey: text('storage_key'),              // cloudinary public_id for deletion
  label:      text('label'),                    // optional user label e.g. "Key diagram"
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  bookmark: one(bookmarks, { fields: [attachments.bookmarkId], references: [bookmarks.id] }),
  user:     one(users,     { fields: [attachments.userId],     references: [users.id] }),
}))

// ─────────────────────────────────────────────
// TOPICS (wiki pages)
// ─────────────────────────────────────────────
export const topics = pgTable('topics', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  emoji:       text('emoji').default('📄'),
  summary:     text('summary'),           // short 1-2 sentence description
  isPublic:    boolean('is_public').default(false),
  coverColor:  text('cover_color').default('#4f6ef7'),
  slug:        text('slug'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ─────────────────────────────────────────────
// TOPIC BLOCKS (rich content inside a topic)
// Block types: heading | paragraph | bullet |
//              code | quote | image | divider | bookmark_embed
// ─────────────────────────────────────────────
export const topicBlocks = pgTable('topic_blocks', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  topicId:    uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(),     // heading|paragraph|bullet|code|quote|image|divider|bookmark_embed
  content:    text('content'),            // text content for text blocks
  metadata:   text('metadata'),           // JSON: { level: 1 } for headings, { language: 'js' } for code
  order:      text('order').notNull(),    // fractional indexing for drag-to-reorder
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ─────────────────────────────────────────────
// TOPIC REFERENCES (bookmarks attached to a topic)
// ─────────────────────────────────────────────
export const topicReferences = pgTable('topic_references', {
 // id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  topicId:    uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  bookmarkId: uuid('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  note:       text('note'),               // why this reference is relevant
  addedAt:    timestamp('added_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.topicId, table.bookmarkId] }),
}))

// ─────────────────────────────────────────────
// TOPIC CONNECTIONS (links between topics)
// ─────────────────────────────────────────────
export const topicConnections = pgTable('topic_connections', {
  //id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  fromTopicId: uuid('from_topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  toTopicId:   uuid('to_topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  label:       text('label'),             // optional relationship label "leads to", "part of"
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.fromTopicId, table.toTopicId] }),
}))

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────
export const topicsRelations = relations(topics, ({ one, many }) => ({
  user:        one(users,   { fields: [topics.userId], references: [users.id] }),
  blocks:      many(topicBlocks),
  references:  many(topicReferences),
  connections: many(topicConnections, { relationName: 'fromTopic' }),
  backlinks:   many(topicConnections, { relationName: 'toTopic' }),
}))

export const topicBlocksRelations = relations(topicBlocks, ({ one }) => ({
  topic: one(topics, { fields: [topicBlocks.topicId], references: [topics.id] }),
}))

export const topicReferencesRelations = relations(topicReferences, ({ one }) => ({
  topic:    one(topics,    { fields: [topicReferences.topicId],    references: [topics.id] }),
  bookmark: one(bookmarks, { fields: [topicReferences.bookmarkId], references: [bookmarks.id] }),
}))

export const topicConnectionsRelations = relations(topicConnections, ({ one }) => ({
  fromTopic: one(topics, { fields: [topicConnections.fromTopicId], references: [topics.id], relationName: 'fromTopic' }),
  toTopic:   one(topics, { fields: [topicConnections.toTopicId],   references: [topics.id], relationName: 'toTopic' }),
}))

// ─────────────────────────────────────────────
// READING LIST
// ─────────────────────────────────────────────
export const readingList = pgTable('reading_list', {
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookmarkId: uuid('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  isRead:     boolean('is_read').default(false),
  addedAt:    timestamp('added_at', { withTimezone: true }).defaultNow(),
  readAt:     timestamp('read_at', { withTimezone: true }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.bookmarkId] }),
}))

export const readingListRelations = relations(readingList, ({ one }) => ({
  user:     one(users,     { fields: [readingList.userId],     references: [users.id] }),
  bookmark: one(bookmarks, { fields: [readingList.bookmarkId], references: [bookmarks.id] }),
}))

// ─────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────
export const feedback = pgTable('feedback', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email:     text('email'),
  category:  text('category').notNull().default('general'),
  message:   text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
