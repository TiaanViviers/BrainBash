# Category Management Documentation

## Overview

The category system manages trivia question categories (e.g., Science, History, Geography, Entertainment). Categories organize questions into logical groups and allow players to filter matches by topic preference. The system provides both public endpoints for viewing categories and admin endpoints for category management.

### Key Features

- **Public Access** - All users can view categories without authentication
- **Question Statistics** - Track question counts by difficulty per category
- **Admin Management** - CRUD operations for category maintenance
- **Validation** - Name uniqueness, length constraints, safe deletion
- **Database Integration** - Prisma ORM with optimized queries

---

## Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ HTTP Requests
       ↓
┌──────────────────┐
│ Category Routes  │  ← /api/categories
│  (routes.js)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│Category Controller│ ← HTTP handlers
│ (controller.js)  │    Input validation
└────────┬─────────┘    Response formatting
         ↓
┌──────────────────┐
│ Category Service │  ← Business logic
│  (service.js)    │     Database queries
└────────┬─────────┘     Statistics
         ↓
┌──────────────────┐
│  Prisma ORM      │  ← Database access
│  (PostgreSQL)    │
└──────────────────┘
```

---

## API Endpoints

### 1. List All Categories

**Endpoint:** `GET /api/categories`  
**Authentication:** Not required (public)  
**Description:** Retrieve all trivia categories sorted alphabetically.

#### Request

No parameters required.

#### Success Response (200 OK)

```json
{
  "ok": true,
  "categories": [
    {
      "category_id": 1,
      "name": "Science",
      "description": "Questions about physics, chemistry, biology, and astronomy"
    },
    {
      "category_id": 2,
      "name": "History",
      "description": "Questions about historical events, figures, and periods"
    },
    {
      "category_id": 3,
      "name": "Geography",
      "description": "Questions about countries, capitals, landmarks, and maps"
    }
  ]
}
```

#### Error Response (500)

```json
{
  "ok": false,
  "error": "Failed to fetch categories",
  "message": "Database connection error"
}
```

#### Usage Notes
- Returns all categories in alphabetical order by name
- No pagination (expected to be small dataset)
- Used by match creation UI to let users select category
- Publicly accessible (no authentication required)

---

### 2. Get Single Category

**Endpoint:** `GET /api/categories/:id`  
**Authentication:** Not required (public)  
**Description:** Retrieve details of a specific category by ID.

#### Request Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| id | integer | path | Category ID |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "category": {
    "category_id": 1,
    "name": "Science",
    "description": "Questions about physics, chemistry, biology, and astronomy"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid category ID"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

---

### 3. Get Category Statistics

**Endpoint:** `GET /api/categories/:id/stats`  
**Authentication:** Not required (public)  
**Description:** Get category details with question count breakdown by difficulty.

#### Request Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| id | integer | path | Category ID |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "stats": {
    "category_id": 1,
    "name": "Science",
    "description": "Questions about physics, chemistry, biology, and astronomy",
    "questionCounts": {
      "easy": 150,
      "medium": 200,
      "hard": 100,
      "total": 450
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid category ID"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

#### Usage Notes
- Useful for showing players how many questions exist in each category
- Can inform difficulty selection in match creation
- Updated in real-time as questions are added/removed

---

### 4. Create Category (Admin)

**Endpoint:** `POST /api/categories`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Create a new trivia category.

#### Request Body

```json
{
  "name": "Technology",
  "description": "Questions about computers, programming, and modern tech"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | Yes | 1-100 characters, unique |
| description | string | No | Max 500 characters |

#### Success Response (201 Created)

```json
{
  "ok": true,
  "category": {
    "category_id": 4,
    "name": "Technology",
    "description": "Questions about computers, programming, and modern tech"
  },
  "message": "Category created successfully"
}
```

#### Error Responses

**400 Bad Request** - Missing/invalid name
```json
{
  "ok": false,
  "error": "Category name is required"
}
```

**400 Bad Request** - Name too long
```json
{
  "ok": false,
  "error": "Category name must be less than 100 characters"
}
```

**409 Conflict** - Name already exists
```json
{
  "ok": false,
  "error": "A category with this name already exists"
}
```

#### Usage Notes
- Category name must be unique (case-sensitive in database)
- Description is optional but recommended
- New categories start with 0 questions
- Admin authentication required (implement middleware)

---

### 5. Update Category (Admin)

**Endpoint:** `PUT /api/categories/:id`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Update an existing category's name or description.

#### Request Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| id | integer | path | Category ID |

#### Request Body

```json
{
  "name": "Computer Science",
  "description": "Updated description for clarity"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | No* | 1-100 characters, unique |
| description | string | No* | Max 500 characters |

*At least one field (name or description) must be provided.

#### Success Response (200 OK)

```json
{
  "ok": true,
  "category": {
    "category_id": 4,
    "name": "Computer Science",
    "description": "Updated description for clarity"
  },
  "message": "Category updated successfully"
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid category ID"
}
```

**400 Bad Request** - No fields provided
```json
{
  "ok": false,
  "error": "At least one field (name or description) is required"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

**409 Conflict** - Name already taken
```json
{
  "ok": false,
  "error": "A category with this name already exists"
}
```

#### Usage Notes
- Can update name, description, or both
- Name uniqueness still enforced
- Setting description to empty string/null clears it
- Admin authentication required (implement middleware)

---

### 6. Delete Category (Admin)

**Endpoint:** `DELETE /api/categories/:id`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Delete a category (protected if questions exist).

#### Request Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| id | integer | path | Category ID |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Category deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid category ID"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

**409 Conflict** - Category has questions
```json
{
  "ok": false,
  "error": "Cannot delete category with existing questions. Delete questions first."
}
```

#### Usage Notes
- **Safety Check**: Cannot delete categories with questions
- Prevents orphaned questions in database
- Admin must delete all questions first, then delete category
- No soft delete (permanent removal)
- Admin authentication required (implement middleware)

---

## Frontend Integration

### Fetch All Categories

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function CategorySelector() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading categories...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <select name="category">
      <option value="">Select a category</option>
      {categories.map(cat => (
        <option key={cat.category_id} value={cat.category_id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}

export default CategorySelector;
```

---

### Display Category Statistics

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function CategoryStats({ categoryId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [categoryId]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get(`/categories/${categoryId}/stats`);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!stats) return null;

  return (
    <div className="category-stats">
      <h3>{stats.name}</h3>
      <p>{stats.description}</p>
      <div className="question-counts">
        <div>
          <span>Easy:</span>
          <span>{stats.questionCounts.easy}</span>
        </div>
        <div>
          <span>Medium:</span>
          <span>{stats.questionCounts.medium}</span>
        </div>
        <div>
          <span>Hard:</span>
          <span>{stats.questionCounts.hard}</span>
        </div>
        <div className="total">
          <span>Total:</span>
          <span>{stats.questionCounts.total}</span>
        </div>
      </div>
    </div>
  );
}

export default CategoryStats;
```

---

### Admin: Create Category

```jsx
import React, { useState } from 'react';
import api from './api';

function CreateCategoryForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/categories', formData);
      alert(data.message);
      setFormData({ name: '', description: '' });
      onSuccess?.(data.category);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New Category</h3>
      
      <input
        type="text"
        placeholder="Category name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        maxLength={100}
      />
      
      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        maxLength={500}
        rows={3}
      />
      
      {error && <p className="error">{error}</p>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Category'}
      </button>
    </form>
  );
}

export default CreateCategoryForm;
```

---

### Admin: Edit Category

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function EditCategoryForm({ categoryId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      const { data } = await api.get(`/categories/${categoryId}`);
      setFormData({
        name: data.category.name,
        description: data.category.description || ''
      });
    } catch (err) {
      setError('Failed to load category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.put(`/categories/${categoryId}`, formData);
      alert(data.message);
      onSuccess?.(data.category);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Edit Category</h3>
      
      <input
        type="text"
        placeholder="Category name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        maxLength={100}
      />
      
      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        maxLength={500}
        rows={3}
      />
      
      {error && <p className="error">{error}</p>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Category'}
      </button>
    </form>
  );
}

export default EditCategoryForm;
```

---

### Admin: Delete Category

```jsx
import React, { useState } from 'react';
import api from './api';

function DeleteCategoryButton({ categoryId, categoryName, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${categoryName}"?\n\n` +
      `This can only be done if the category has no questions.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { data } = await api.delete(`/categories/${categoryId}`);
      alert(data.message);
      onSuccess?.();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete category';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDelete} 
      disabled={loading}
      className="delete-button"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}

export default DeleteCategoryButton;
```

---

## Service Layer Functions

### `getAllCategories()`

Retrieves all categories sorted alphabetically.

```javascript
const categories = await getAllCategories();
// Returns: [{ category_id, name, description }, ...]
```

**Use Case:** Populate category dropdown in match creation form.

---

### `getCategoryById(categoryId)`

Get a single category by ID.

```javascript
const category = await getCategoryById(1);
// Returns: { category_id: 1, name: "Science", description: "..." }
```

**Throws:** `Error("Category not found")` if ID doesn't exist.

---

### `getCategoryStats(categoryId)`

Get category with question count breakdown.

```javascript
const stats = await getCategoryStats(1);
// Returns: {
//   category_id: 1,
//   name: "Science",
//   description: "...",
//   questionCounts: { easy: 150, medium: 200, hard: 100, total: 450 }
// }
```

**Throws:** `Error("Category not found")` if ID doesn't exist.

---

### `createCategory({ name, description })`

Create a new category.

```javascript
const category = await createCategory({
  name: "Technology",
  description: "Tech questions"
});
// Returns: { category_id: 4, name: "Technology", description: "..." }
```

**Throws:** `Error("A category with this name already exists")` if name conflict.

---

### `updateCategory(categoryId, updates)`

Update category name and/or description.

```javascript
const category = await updateCategory(1, {
  name: "Computer Science",
  description: "Updated description"
});
// Returns: { category_id: 1, name: "Computer Science", description: "..." }
```

**Throws:**
- `Error("Category not found")` if ID doesn't exist
- `Error("A category with this name already exists")` if name conflict

---

### `deleteCategory(categoryId)`

Delete a category (only if it has no questions).

```javascript
await deleteCategory(1);
// Returns: void (no return value)
```

**Throws:**
- `Error("Category not found")` if ID doesn't exist
- `Error("Cannot delete category: X questions exist in this category")` if questions exist

---

### Utility Functions

#### `categoryExistsByName(name)`

Check if a category exists by name.

```javascript
const exists = await categoryExistsByName("Science");
// Returns: true or false
```

#### `getCategoryByName(name)`

Get category by name (exact match, case-sensitive).

```javascript
const category = await getCategoryByName("Science");
// Returns: { category_id, name, description } or null
```

---

## Database Schema

### Categories Table

```sql
categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT
)
```

**Constraints:**
- `name` must be unique
- `name` cannot be null or empty
- `description` is optional

**Indexes:**
- Primary key on `category_id`
- Unique index on `name`

**Related Tables:**
- `trivia_questions` - Foreign key `category_id` references `categories(category_id)`

---

## Seeded Categories

The database includes the following default categories (see `server/prisma/seed.js`):

1. **General Knowledge** - Miscellaneous topics
2. **Science** - Physics, chemistry, biology, astronomy
3. **History** - Historical events, figures, periods
4. **Geography** - Countries, capitals, landmarks, maps
5. **Entertainment** - Movies, music, TV shows, celebrities
6. **Sports** - Athletics, teams, players, records
7. **Arts & Literature** - Books, authors, paintings, artists
8. **Technology** - Computers, programming, modern tech

---

## Admin Implementation TODO

The category admin endpoints are currently **unprotected**. To secure them:

### 1. Add Authentication Middleware

Update `server/src/category/routes.js`:

```javascript
import { authenticateToken, requireAdmin } from '../auth/middleware.js';

// Apply admin middleware to create/update/delete routes
router.post('/', authenticateToken, requireAdmin, controller.createCategory);
router.put('/:id', authenticateToken, requireAdmin, controller.updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, controller.deleteCategory);
```

### 2. Create Admin User

Ensure admin users exist in the database:

```javascript
// In seed.js or manually
await prisma.users.create({
  data: {
    username: 'admin',
    email: 'admin@example.com',
    password_hash: await hashPassword('AdminPass123'),
    role: 'ADMIN'
  }
});
```

### 3. Frontend Admin Page

Create an admin dashboard accessible only to admins:

```jsx
function AdminCategoriesPage() {
  const { user } = useAuth();
  
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }
  
  return (
    <div>
      <h1>Category Management</h1>
      <CreateCategoryForm />
      <CategoryList />
    </div>
  );
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "ok": false,
  "error": "Error category",
  "message": "Detailed error message"
}
```

### Common Errors

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | Invalid category ID | Non-numeric or missing ID parameter |
| 400 | Category name is required | Empty or missing name in create |
| 400 | Category name must be less than 100 characters | Name too long |
| 400 | At least one field is required | Update with no fields |
| 404 | Category not found | ID doesn't exist in database |
| 409 | A category with this name already exists | Name uniqueness violation |
| 409 | Cannot delete category with existing questions | Delete blocked by questions |
| 500 | Failed to fetch categories | Database connection error |

---

## Testing

### Manual Testing with cURL

**List all categories:**
```bash
curl http://localhost:3000/api/categories
```

**Get single category:**
```bash
curl http://localhost:3000/api/categories/1
```

**Get category stats:**
```bash
curl http://localhost:3000/api/categories/1/stats
```

**Create category (admin):**
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Technology",
    "description": "Computer and tech questions"
  }'
```

**Update category (admin):**
```bash
curl -X PUT http://localhost:3000/api/categories/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Computer Science",
    "description": "Updated description"
  }'
```

**Delete category (admin):**
```bash
curl -X DELETE http://localhost:3000/api/categories/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Performance Considerations

### Database Queries

✅ **Optimized:**
- Simple `findMany()` queries with minimal fields
- Index on `name` field for fast lookups
- `orderBy` done in database (not application)

⚠️ **Watch Out:**
- Category stats queries load all questions (can be slow for large datasets)
- Consider caching question counts if categories have thousands of questions
- Add pagination if category list grows large (unlikely)

### Caching Recommendations

For production:

```javascript
import NodeCache from 'node-cache';
const categoryCache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

export async function getAllCategories() {
  const cacheKey = 'all-categories';
  const cached = categoryCache.get(cacheKey);
  
  if (cached) return cached;
  
  const categories = await prisma.categories.findMany({ /* ... */ });
  categoryCache.set(cacheKey, categories);
  
  return categories;
}
```

---

## Known Issues & Limitations

### Current Limitations

1. **No admin middleware** - Create/update/delete endpoints are unprotected
2. **Case-sensitive names** - "Science" and "science" are different categories
3. **No soft delete** - Deleted categories are permanently removed
4. **No audit trail** - No logging of who created/modified categories
5. **No bulk operations** - Can't create/update/delete multiple categories at once
6. **No category icons** - Categories are text-only (could add icon URLs)
7. **No category ordering** - Always alphabetical (could add sort_order field)

### Future Enhancements

- Add category icon/image support
- Implement soft delete (archive instead of delete)
- Add category popularity tracking (most played)
- Allow categories to have subcategories
- Add category tags/keywords for search
- Implement category suggestions based on user preferences
- Add API rate limiting on admin endpoints

---

## Best Practices

### Frontend

**Cache categories** - Fetch once on app load, store in context/state  **Validate inputs** - Check name length before submitting  
**Confirm deletes** - Always prompt user before deletion  
**Show question counts** - Help users pick categories with enough questions  
**Handle errors gracefully** - Show user-friendly messages  

### Backend

**Trim inputs** - Remove leading/trailing whitespace from names  
**Validate constraints** - Check length limits before database call  
**Use transactions** - Not needed currently, but prepare for future  
**Log errors** - Console.error all caught exceptions  
**Return consistent format** - Always use `{ ok, ... }` structure  

---

## Contact & Maintenance

This category system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/category/routes.js` - Route definitions
- `server/src/category/controller.js` - HTTP request handlers
- `server/src/category/service.js` - Business logic and database queries

**Dependencies:**
- `@prisma/client` - Database ORM
- `express` - Web framework

**Last Updated:** 15 October 2025
