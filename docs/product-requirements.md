# Product Requirements Document

## 1. Overview

### 1.1 Purpose

This document outlines the requirements for a monolithic web application that integrates functionalities similar to Fable, Goodreads, Letterboxd, and Substack. The platform will allow users to keep track of reading and viewing habits (books, articles, movies, TV shows), engage socially through clubs and follower systems, and discover new content through advanced recommendation features.

### 1.2 Scope

- **Monolithic architecture** that comprises:
  - **Front End**: Next.js (React-based)
  - **Back End**: FastAPI (Python)
  - **Database**: MongoDB
- Core functionalities:
  - **User authentication**
  - **Shelf management** for different media types (Books, Movies, TV Shows, Articles)
  - **Item management**
  - **Social & community features** (e.g., clubs, posting, following)
  - **Article publishing & subscriptions** (in a Substack-like model)
  - **Progress tracking & reviews**
  - **User statistics**
  - **Notifications**
  - **Search & discoverability** with AI-based recommendations

---

## 2. Functional Requirements

### 2.1 User Authentication & Account Settings

1. **Login/Register**
   - Users can create accounts via:
     - Email + password
     - Gmail OAuth
   - Future support for other social logins (Facebook, Twitter, etc.).
2. **Password Management**
   - “Forgot Password” flow for resetting passwords.
3. **Account Settings**
   - Edit username, email, and profile picture.
   - Manage privacy settings (e.g., for shelf lists, profile visibility).

### 2.2 Shelf Management

1. **Default Shelf Lists**
   - “To Read,” “To Watch,” “Currently Reading,” “Currently Watching,” “Did Not Finish,” etc.
   - **Articles**: Pre-defined list for “Saved Articles.”
2. **Custom Shelf Lists**
   - Users can create new shelf lists with custom names for any media type (Books, Articles, Movies, TV Shows).
   - Users can set custom shelf covers (in a simple format initially).
3. **Organization & Management**
   - Ability to move items between shelf lists.
   - Sorting and filtering of shelf lists (by rating, genre, etc.).
   - Users can search within their shelf lists.
   - Users can delete shelf lists no longer needed.
   - Users can mark shelf lists as public or private.

### 2.3 Item Management (Books, Articles, Movies, TV Shows)

1. **Browse & Search**
   - Users can browse an aggregated library of items.
   - Users can search by title, author/creator, genre, or year.
   - Articles are discoverable in the same search system as books, movies, and TV shows.
   - Advanced search filters (content ratings, critics’ reviews, etc.).
2. **View Item Details**
   - Display detailed information such as:
     - Title, Author/Director, Synopsis
     - Release year, Genre
     - Ratings (user-based and, if feasible, external)
   - Integration with external media platforms (e.g., Goodreads, Letterboxd) for easy importing.
3. **Recommendations**
   - Basic recommendations based on user history.
   - Advanced AI algorithms for personalized recommendations (in future phases).
4. **Add/Remove Items to Shelf**
   - Users can add or remove items to/from any shelf list (including articles).
5. **Article Management**
   - Users can add an article by providing a link if it doesn't exist in the system.
   - The article’s metadata (title, author, publication, etc.) is fetched automatically if available.
   - Saved articles are placed in the default “Saved Articles” list or a custom shelf.

### 2.4 Social & Community Features

1. **User Posts**
   - Users can create posts about their progress, thoughts, reviews, or updates.
   - Posts support:
     - Text, basic formatting, images, emojis, GIFs (initially simple text + images).
     - Liking, commenting, sharing.
2. **Follower System**
   - Basic friend/follower model to see updates from people/clubs you follow.
   - Over time, can expand to more social graph features.
3. **Direct Interactions**
   - Comments/reactions on posts.
   - Initially focus on comment threads; private messaging may come later.
4. **Sharing / Reshelving**
   - Users can share other users’ posts to their own feed (repost).
   - Potential for external sharing (e.g., Twitter, Facebook) in later iterations.

### 2.5 Clubs Features

1. **Club Creation & Membership**
   - Any user can create a club (public or private).
   - Other users can search, join, or request to join clubs.
2. **Club Content**
   - Club admins can share specific content or media relevant to the club (e.g., reading lists, watch lists, or article curation).
   - Basic notification system for club updates.
3. **Club Communications**
   - Initially focus on a simple timeline or thread-based discussion for club members.
   - Club-specific chat rooms in future development.
4. **Paid Article Channels (Substack-like)**
   - Clubs for articles may function like Substack channels, where writers can charge subscriptions for their content.
   - Writers can set paywalls or free tiers for articles, with managed access for subscribers.
5. **Events & Meetups (Future)**
   - Organize club meetups (virtual or in-person).

### 2.6 Progress Tracking

1. **Media Progress**
   - Mark items as “In Progress,” “Completed,” “On Hold,” “Dropped,” etc.
   - For articles, a user might mark them as “Reading” or “Finished Reading.”
2. **Streaks & Analytics**
   - Display daily/weekly engagement streaks.
   - In-depth analytics in future (pages read, minutes watched, reading speed, etc.).

### 2.7 Reviews & Ratings

1. **Rating System**
   - Users can rate items on a numeric or star-based scale.
   - Support half or quarter stars for more nuanced ratings.
2. **Review Formats**
   - Text-based reviews with support for images, emojis, GIFs.
   - Potential for voice or video reviews in the future.

### 2.8 User Statistics

1. **Personal Stats Dashboard**
   - Summaries of monthly reading/watching history.
   - Genre breakdown (e.g., 40% fantasy, 30% sci-fi, 30% nonfiction).
   - Tracking user engagement (number of items finished per month, etc.).
2. **Article Stats**
   - Statistics specific to articles read or saved per month.
   - If the user is a writer, track subscriptions, earnings (from paid clubs), and article reads.

### 2.9 Notifications

1. **Basic Notifications**
   - For new releases, recommendations, comments, likes, and club updates.
2. **Streak Notifications**
   - Reminders to continue reading or watching to maintain streaks.
3. **Payment & Subscription Notifications**
   - If participating in paid clubs, notify on successful subscription, renewal, or payment issues.

### 2.10 Search & Discoverability

1. **Unified Search**
   - Users can search across Books, Articles, Movies, TV Shows within a single interface.
   - Articles discovered in search can be added to shelves or read immediately if available.
2. **Advanced Filters**
   - Sorting by popularity, user rating, or critics’ reviews.
   - Filtering by recommended content ratings.
3. **AI-Powered Chatbot (Future)**
   - Users can ask for targeted recommendations across all media types, including articles.
   - Enhanced discoverability with personalized queries.
4. **Trending Content**
   - Show popular or trending media (global or within user’s network).
   - Separate trending sections for articles vs. books, movies, and TV shows.

---

## 3. Non-Functional Requirements

1. **Performance**
   - Optimized endpoints (FastAPI) for rapid response.
   - Efficient database queries (MongoDB with appropriate indexes).
2. **Scalability**
   - While monolithic initially, design with separation of concerns to allow future modularization (microservices if needed).
3. **Security**
   - Use industry-standard practices for password hashing, session management (JWT or similar).
   - Secure external API integrations (OAuth, etc.).
   - Payment security for paid article channels (PCI-compliant methods, if applicable).
4. **Usability**
   - Intuitive UI/UX for shelf management, item searching, article creation, and subscription management.
   - Responsive design for mobile and desktop.
   - **Use of Pre-made UI Components**: Considering **Shadcn** (paired with Tailwind) for a consistent, pre-built UI component library to accelerate development and ensure design uniformity.
5. **Maintainability**
   - Clear separation of front-end (Next.js) and back-end (FastAPI).
   - Use code linting, type checking (TypeScript in Next.js if desired), and thorough documentation.

---

## 4. Technical Stack

- **Front-end**:
  - **Next.js** (React-based, supports SSR/ISR)
  - **Tailwind CSS** for styling
  - **Shadcn** (optional but recommended) for pre-built UI components
- **Back-end**:
  - **FastAPI** (Python)
- **Database**:
  - **MongoDB**
- **Architecture**: Monolithic deployment
  - Single repository hosting front-end and back-end code.
  - Could be served via Docker containers or a traditional web server.

---

## 5. Milestones & Roadmap

1. **MVP (Minimum Viable Product)**
   - User authentication (email, Gmail)
   - Basic shelf management (create lists, add items)
   - Basic item search and detail view (Books, Movies, TV, Articles)
   - Basic social features (posts, likes, comments)
   - Basic clubs (create, join, simple sharing of content)
   - Basic notifications
2. **Phase 2**
   - Advanced shelf organization (sorting, searching within shelves)
   - Follower system improvements
   - Paid clubs or article channels (subscription model)
   - Private club functionality
   - Enhanced item detail pages (reviews, ratings)
   - Streak tracking
3. **Phase 3**
   - AI-based recommendation engine
   - In-depth analytics for user statistics
   - Club chat and events
   - Extended social logins (Facebook, Twitter)
   - Advanced rating options (half/quarter stars)
   - Media import integrations (Goodreads, Letterboxd)
4. **Future Enhancements**
   - Video/voice reviews
   - External cross-sharing to other platforms
   - Chatbot for personalized recommendations
   - Fine-grained privacy controls
   - Expanded monetization features (tiered subscriptions, sponsor integrations)

---

## 6. Acceptance Criteria (High-Level)

1. **User can register, log in, and update account settings** successfully.
2. **User can create multiple shelves, add items (including articles)**, and see them reflected immediately.
3. **User can post, like, and comment** without errors.
4. **Clubs can be created and joined** with appropriate permissions (public/private).
5. **Paid article clubs** support subscription-based access to content.
6. **Rating and reviewing** items is functional, with ratings displayed in item detail pages.
7. **Users receive notifications** for interactions and updates.
8. **Search** returns relevant items (books, articles, movies, TV shows) within acceptable performance metrics (e.g., under 2 seconds).
9. **Article additions via link** fetch metadata automatically or allow manual entry.

---

## 7. Dependencies & External Integrations

- **OAuth** for social logins (Gmail initially, possibly others in future).
- **Media APIs** (e.g., Google Books API, TMDb for movies/TV).
- **Article Metadata APIs** (e.g., Open Graph, or in-house scraping for link-based article submissions).
- **Payment Gateway** for paid clubs/channels (Stripe or PayPal integration).
- **UI Components**: Shadcn (optional but recommended) in combination with Tailwind CSS.

---

## 8. Risks & Constraints

1. **API Rate Limits** from external services (e.g., Google Books, TMDb).
2. **Scalability** if user base grows quickly. Need to ensure architecture can be optimized or broken into services if needed.
3. **Data Consistency** especially with frequent item updates/imports from external sources.
4. **Security & Privacy** ensuring user-generated content is moderated and private data is protected.
5. **Payment Compliance** (PCI-DSS) if implementing paid subscriptions.
6. **UI Consistency** adopting Shadcn or another UI framework ensures uniformity but requires initial setup and customization.

---

## 9. Conclusion

This platform aims to unify the best features of reading/watching apps and social publishing platforms into a single monolithic application, leveraging **Next.js** for the front end, **FastAPI** for the back end, and **MongoDB** for data storage. By focusing on core functionalities first—particularly shelf management, social features, and club/paid channels for articles—the product can be iterated upon to include advanced AI recommendations and enhanced community interaction features.

Utilizing **Tailwind CSS** (optionally with **Shadcn**) helps streamline the front-end development process by providing a robust foundation for consistent, responsive, and maintainable UI components.

**End of Document**
