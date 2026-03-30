# ShowHub

A modern, robust backend platform for booking movies and events, inspired by BookMyShow. Built with scalability and performance in mind using Node.js, Express, TypeScript, MongoDB, and Redis.

## Key Implemented Features

- **Authentication & Authorization**: Secure JWT-based authentication with refresh token rotation and HTTP-only cookies. Role-based access control (Admin, Customer, Theatre Partner, Event Organizer).
- **Movie Management**: 
  - Admin functionalities for adding, updating, and soft-deleting movies.
  - User endpoints to browse movies by city, search with text-indexes, filter by upcoming/now-showing, and pagination.
  - Highly optimized queries utilizing MongoDB aggregation pipelines.
- **Event & Theater Management**: 
  - Organizer capabilities to create, update, and manage events.
  - Partner functionalities to manage theaters (venues) and layout.
  - User filtering by category, city, date, and availability.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Caching**: Redis (ioredis)
- **Validation**: Zod
- **Security**: bcrypt, jsonwebtoken
- **Real-time**: Socket.IO
- **Message Queue**: BullMQ
- **Payments**: Razorpay

## Backend Architecture Overview

ShowHub follows a scalable MVC (Model-View-Controller) architecture, separating business logic, routing, and database interactions:
- **Routes**: Define API endpoints and apply relevant middleware.
- **Controllers**: Handle core business logic, coordinate with models, and manage caching.
- **Models**: Mongoose schemas defining data structure, relationships, and text indexes for search.
- **Middleware**: Intercept requests for authentication, role validation, and error handling.
- **Utils**: Reusable helpers like standardized API responses, API errors, and Redis cache managers.

## Folder Structure

```text
src/
├── app.ts                 # Main Express application setup
├── config/                # Database and environment configurations
├── controllers/           # Business logic (Movies, Users, Events, etc.)
├── middlewares/           # Auth and role authorization guards
├── models/                # Mongoose schemas (Users, Movies, Events, Shows, etc.)
├── routes/                # Express route definitions
├── schemas/               # Zod validation schemas
└── utils/                 # Utility functions (ApiError, ApiResponse, asyncHandler, redis)
```

## API Overview

### Auth Routes (`/api/v1/auth`)
- `POST /register` - Register a new user
- `POST /login` - Authenticate user and issue tokens
- `POST /logout` - Clear user session/cookies
- `POST /reset-Password` - Update user password
- `POST /generateToken` - Obtain a new access token using a refresh token

### Movie Routes (`/api/v1/movies`)
- `GET /` - Fetch all movies (paginated, filterable)
- `GET /search` - MongoDB text-search for movies
- `GET /coming-soon` - Fetch upcoming movies
- `GET /now-showing` - Fetch actively playing movies by city
- `GET /city/:city` - Fetch movies currently running in a specific venue/city
- `GET /slug/:slug` - Get movie details by unique slug
- `POST /addMovie` - **(Admin)** Add a new movie
- `PATCH /updateMovie/:id` - **(Admin)** Update movie details
- `DELETE /deleteMovie/:id` - **(Admin)** Soft-delete a movie

### Event Routes (`/api/v1/events`)
- `GET /` - Fetch all events
- `GET /upcoming` - Fetch upcoming events
- `GET /:slug` - Fetch event details by unique slug
- `GET /:city` - Fetch events currently actively playing in a specific city
- `GET /organizer` - **(Event Organizer)** Fetch organizer's events
- `GET /:eventId` - **(Event Organizer)** Fetch specific event detail
- `POST /create` - **(Event Organizer)** Create a new event
- `POST /update/:eventId` - **(Event Organizer)** Update an event
- `POST /delete/:eventId` - **(Event Organizer)** Delete an event

### Theater Routes (`/api/v1/theaters`)
- `GET /` - Fetch all theaters
- `GET /:theaterId` - Fetch theater details
- `GET /:theaterId/layout` - Fetch layout details of a theater
- `GET /:theaterId/movies` - Fetch movies playing in a specific theater
- `GET /partner` - **(Theatre Partner)** Fetch theaters belonging to the partner
- `POST /create` - **(Theatre Partner)** Add a new theater
- `PATCH /update/:theaterId` - **(Theatre Partner)** Update theater details
- `DELETE /delete/:theaterId` - **(Theatre Partner)** Delete a theater

### Show Routes (`/api/v1/shows`)
- `GET /movie/:movieId` - Fetch shows for a specific movie
- `GET /event/:eventId` - Fetch shows for a specific event
- `GET /:showId` - Fetch show details
- `POST /create` - **(Admin, Event Organizer, Theatre Partner)** Create a new show
- `PATCH /update/:showId` - **(Admin, Event Organizer, Theatre Partner)** Update a show
- `DELETE /delete/:showId` - **(Admin, Event Organizer, Theatre Partner)** Delete a show

### Venue Routes (`/api/v1/venues`)
- `GET /:city` - Fetch venues by city
- `GET /:showId` - Fetch venue details for a show
- `GET /:venueId` - Fetch shows playing at a specific venue
- `POST /create` - **(Admin, Event Organizer, Theatre Partner)** Create a new venue

### Seat Routes (`/api/v1/seats`)
- `GET /:showId/seatmap` - Fetch the interactive seat map for a show
- `GET /:showId/availableseats` - Fetch available seat IDs for a show
- `POST /:showId` - **(Authenticated)** Lock or release seats for a show (Real-time updates via Socket.IO)

## Redis Usage

Redis is actively utilized as a caching layer to reduce database load and improve response times for high-traffic movie discovery endpoints. 
- Cached routes include: movie listings with applied filters, city-based queries, individual slug lookups, text searches, and "coming soon" / "now showing" feeds. 
- TTL (Time-To-Live) is strategically set varying from 30 minutes to 6 hours depending on the volatility of the data.

## Error Handling and Middleware Design

- **asyncHandler**: A wrapper utility around all controller functions that catches unhandled promise rejections and forwards them to the Express error handler, eliminating the need for repetitive `try-catch` blocks.
- **ApiError & ApiResponse**: Standardized classes ensuring consistent JSON structures for both successful requests and exceptions across the application.
- **authMiddleware**: Extracts and verifies JWTs from headers or HTTP-only cookies, attaching the resolved User context (`id`, `role`, `email`) to the `req` object.
- **authorizeRoles**: A granular middleware factory that guards specific endpoints (e.g., `ADMIN` only or `EVENT_ORGANIZER` only).

## Scalability and Production-Ready Patterns

- **JWT Refresh Token Rotation**: Enhances security by utilizing short-lived access tokens alongside securely stored, rotating HTTP-only refresh tokens.
- **MongoDB Aggregation Pipelines**: Offloads complex data transformations (like joining `Shows`, `Venues`, and `Movies` to determine what's playing in a specific city) directly to the database engine.
- **Database Text Indexing**: Employs MongoDB `$text` search capabilities combined with textScore sorting for performant and relevant search results.
- **Redis Caching Strategy**: Employs key-based caching for computationally heavy aggregations and frequently requested read-heavy data, drastically minimizing database hits.
- **Pagination**: Implemented extensively on list endpoints to manage payload size and query execution time effectively.

## Current Project Status

**Work in Progress (Active Development)**
- **Completed**: User authentication flow, Role-Based Access Control, Movie catalogue management, Event management APIs, Theater/Venue management APIs, Show & Seat management with real-time Socket.IO updates, and robust read-optimized caching logic.
- **Pending/WIP**: Booking endpoints, Queue-based job processing (BullMQ), and Payment gateway integrations (Razorpay). Waitlist and transaction flows are actively being scaffolded.
