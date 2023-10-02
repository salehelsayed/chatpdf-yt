import {integer, pgEnum, pgTable, serial, text, timestamp, varchar} from 'drizzle-orm/pg-core'

export const userSystemEnum = pgEnum("user_system_enum", ["system", "user"])

export const chats = pgTable("chats", {
    id: serial('id').primaryKey(),
    //pdfName. The name that will be shown on the Chat side bar for each chat
    pdfName: text('pdf_name').notNull(), //make sure this name can't be null
    pdfURL: text('pdf_url').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),//Whenever we create a new chat. the timestamp will be now
    //Create a userid that will point to the Clerk userid
    userId: varchar('user_id', {length:256}).notNull(),
    fileKey: text('file_key').notNull(), //this will retrieve the file from AWS S3

});

export type DrizzleChat = typeof chats.$inferSelect;

export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id").references(()=>chats.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),//Whenever we create a new chat. the timestamp will be now
    role: userSystemEnum('role').notNull(),

});

export const userSubscriptions = pgTable("user_subscriptions", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull().unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 256 })
      .notNull()
      .unique(),
    stripeSubscriptionId: varchar("stripe_subscription_id", {
      length: 256,
    }).unique(),
    stripePriceId: varchar("stripe_price_id", { length: 256 }),
    stripeCurrentPeriodEnd: timestamp("stripe_current_period_ended_at"),
  });