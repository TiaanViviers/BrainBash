import { Download, Edit3, HelpCircle, Layers, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import API_URL from "../config";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [form, setForm] = useState({ question_text: "", correct_answer: "", wrong_answer_1: "", wrong_answer_2: "", wrong_answer_3: "", category_id: "", difficulty: "EASY" });
  
  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const questionsPerPage = 20;
  
  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  
  // Real-time presence
  const [activeUsers, setActiveUsers] = useState([]);

  const token = localStorage.getItem("accessToken");

  // Debug: Check if token exists
  useEffect(() => {
    if (!token) {
      console.warn("No authentication token found. User may need to log in.");
    } else {
      console.log("Authentication token found");
    }
  }, [token]);

  // Load active users every 10 seconds
  useEffect(() => {
    loadActiveUsers();
    const interval = setInterval(loadActiveUsers, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Always load categories for the filter dropdown
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === "questions") loadQuestions();
    else if (activeTab === "categories") loadCategories();
    else if (activeTab === "users") loadUsers();
  }, [activeTab, searchTerm, filterCategory, filterDifficulty, currentPage]);

  // ===================================================
  // FETCH FUNCTIONS
  // ===================================================
  const loadQuestions = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterDifficulty) params.append('difficulty', filterDifficulty.toLowerCase());
      params.append('page', currentPage);
      params.append('limit', questionsPerPage);
      
      const url = `${API_URL}/api/questions${params.toString() ? '?' + params.toString() : ''}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      
      // Update pagination info
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalQuestions(data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    try {
      // Get all matches
      const res = await fetch(`${API_URL}/api/match`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // Extract unique users from scheduled/ongoing matches
      const usersInMatches = new Set();
      if (data.matches) {
        data.matches.forEach(match => {
          // Only include users from scheduled or ongoing matches (not FINISHED or CANCELED)
          if (match.status === 'SCHEDULED' || match.status === 'ONGOING') {
            if (match.match_players) {
              match.match_players.forEach(player => {
                const username = player.user?.username || player.username;
                if (username) {
                  usersInMatches.add(username);
                }
              });
            }
          }
        });
      }
      
      setActiveUsers(Array.from(usersInMatches));
    } catch (err) {
      console.error("Failed to load active users:", err);
    }
  };

  // ===================================================
  // 🔹 QUESTION CRUD
  // ===================================================
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      // Check if user is authenticated
      if (!token) {
        alert("❌ You are not logged in. Please log in again.");
        window.location.href = "/login";
        return;
      }
      
      // Validate category_id before sending
      const categoryId = parseInt(form.category_id);
      if (isNaN(categoryId) || !form.category_id) {
        alert("❌ Please select a valid category");
        return;
      }
      
      // Convert form data to match backend expectations
      const payload = {
        ...form,
        category_id: categoryId, // Use validated integer
        difficulty: form.difficulty.toLowerCase() // Convert to lowercase
      };
      
      const res = await fetch(`${API_URL}/api/questions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setForm({ question_text: "", correct_answer: "", wrong_answer_1: "", wrong_answer_2: "", wrong_answer_3: "", category_id: "", difficulty: "EASY" });
        loadQuestions();
        alert("✅ Question added successfully!");
      } else {
        // Handle authentication errors
        if (res.status === 401 || res.status === 403) {
          alert("❌ Session expired. Please log in again.");
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        } else {
          alert(`❌ Error: ${data.error || 'Failed to add question'}\n${data.errors ? data.errors.join('\n') : ''}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setEditForm({
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      wrong_answer_1: question.wrong_answer_1,
      wrong_answer_2: question.wrong_answer_2,
      wrong_answer_3: question.wrong_answer_3,
      category_id: question.category.category_id || question.category_id,
      difficulty: question.difficulty
    });
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        alert("❌ You are not logged in. Please log in again.");
        window.location.href = "/login";
        return;
      }

      const categoryId = parseInt(editForm.category_id);
      if (isNaN(categoryId)) {
        alert("❌ Please select a valid category");
        return;
      }

      const payload = {
        ...editForm,
        category_id: categoryId,
        difficulty: editForm.difficulty.toLowerCase()
      };

      // Strategy: Delete old question and create new one
      // This handles the content_hash primary key issue
      
      const deleteRes = await fetch(`${API_URL}/api/questions/${editingQuestion.content_hash}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!deleteRes.ok) {
        const deleteData = await deleteRes.json();
        throw new Error(`Failed to delete old question: ${deleteData.error || 'Unknown error'}`);
      }

      const createRes = await fetch(`${API_URL}/api/questions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();

      if (createRes.ok) {
        setEditingQuestion(null);
        setEditForm({});
        loadQuestions();
        alert("✅ Question updated successfully!");
      } else {
        if (createRes.status === 401 || createRes.status === 403) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        } else {
          alert(`Error: ${createData.error || 'Failed to create updated question'}\n${createData.errors ? createData.errors.join('\n') : ''}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Delete this question?")) return;
    try {
      await fetch(`${API_URL}/api/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  // ===================================================
  // 🔹 CATEGORY MANAGEMENT
  // ===================================================
  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        alert("You are not logged in. Please log in again.");
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(categoryForm),
      });

      const data = await res.json();

      if (res.ok) {
        setCategoryForm({ name: "", description: "" });
        loadCategories();
        alert("✅ Category added successfully!");
      } else {
        if (res.status === 401 || res.status === 403) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        } else {
          alert(`Error: ${data.error || 'Failed to add category'}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  // ===================================================
  // 🔹 IMPORT QUESTIONS FROM API
  // ===================================================
  const handleImportQuestions = async () => {
    if (importing) return; // Prevent multiple clicks
    
    setImporting(true);
    setImportStatus("Fetching questions from OpenTDB API... This may take 1-2 minutes...");
    
    try {
      const res = await fetch(`${API_URL}/api/trivia/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setImportStatus(`Success! Imported ${data.stats.inserted} new questions (${data.stats.skipped} duplicates skipped)`);
        // Reload questions to show the new ones
        setTimeout(() => {
          loadQuestions();
          setImportStatus("");
        }, 3000);
      } else {
        setImportStatus(`Error: ${data.error || 'Failed to import questions'}`);
        setTimeout(() => setImportStatus(""), 5000);
      }
    } catch (err) {
      console.error(err);
      setImportStatus(`Error: ${err.message}`);
      setTimeout(() => setImportStatus(""), 5000);
    } finally {
      setImporting(false);
    }
  };

  // ===================================================
  // 🔹 USER MANAGEMENT
  // ===================================================
  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === "ADMIN" ? "PLAYER" : "ADMIN";
    try {
      await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (res.ok) {
        loadUsers();
        alert("User deleted successfully");
      } else {
        alert(`Error: ${data.error || 'Failed to delete user'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  // ===================================================
  // 🔹 TAB RENDERING
  // ===================================================
  const renderQuestions = () => (
    <div>
      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] border border-purple-500/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-purple-400" /> Edit Question
            </h3>
            
            <form onSubmit={handleUpdateQuestion} className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={editForm.question_text}
                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                placeholder="Question Text"
                className="md:col-span-2 bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                required
                value={editForm.correct_answer}
                onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                placeholder="Correct Answer"
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                required
                value={editForm.wrong_answer_1}
                onChange={(e) => setEditForm({ ...editForm, wrong_answer_1: e.target.value })}
                placeholder="Wrong Answer 1"
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                required
                value={editForm.wrong_answer_2}
                onChange={(e) => setEditForm({ ...editForm, wrong_answer_2: e.target.value })}
                placeholder="Wrong Answer 2"
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                required
                value={editForm.wrong_answer_3}
                onChange={(e) => setEditForm({ ...editForm, wrong_answer_3: e.target.value })}
                placeholder="Wrong Answer 3"
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <select
                required
                value={editForm.category_id}
                onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={editForm.difficulty}
                onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded p-2 font-semibold transition">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingQuestion(null);
                    setEditForm({});
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded p-2 font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-purple-400" /> Manage Questions
        </h2>
        
        {/* Import Questions Button */}
        <button
          onClick={handleImportQuestions}
          disabled={importing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            importing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
          title="Fetch new questions from OpenTDB API"
        >
          <Download size={18} className={importing ? 'animate-bounce' : ''} />
          {importing ? 'Importing...' : 'Import Questions'}
        </button>
      </div>

      {/* Import Status Message */}
      {importStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          importStatus.includes('Success') 
            ? 'bg-green-500/20 border border-green-500 text-green-400'
            : importStatus.includes('Error')
            ? 'bg-red-500/20 border border-red-500 text-red-400'
            : 'bg-purple-500/20 border border-purple-500 text-purple-400'
        }`}>
          {importStatus}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-[hsl(var(--card))] border border-purple-500/30 p-4 rounded-lg mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="🔍 Search questions..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1); // Reset to page 1 when filtering
            }}
            className="px-4 py-2 bg-gray-700/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          
          <select
            value={filterDifficulty}
            onChange={(e) => {
              setFilterDifficulty(e.target.value);
              setCurrentPage(1); // Reset to page 1 when filtering
            }}
            className="px-4 py-2 bg-gray-700/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          
          {(searchTerm || filterCategory || filterDifficulty) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("");
                setFilterDifficulty("");
                setCurrentPage(1); // Reset to first page
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-400">
          Showing {questions.length} of {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
          {(searchTerm || filterCategory || filterDifficulty) && (
            <span className="ml-2">
              (filtered)
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleAddQuestion} className="bg-[hsl(var(--card))] border border-purple-500/30 p-4 rounded-lg mb-6 grid gap-2 md:grid-cols-2">
        <input
          required
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
          placeholder="Question Text"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <input
          required
          value={form.correct_answer}
          onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
          placeholder="Correct Answer"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <input
          required
          value={form.wrong_answer_1}
          onChange={(e) => setForm({ ...form, wrong_answer_1: e.target.value })}
          placeholder="Wrong Answer 1"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <input
          required
          value={form.wrong_answer_2}
          onChange={(e) => setForm({ ...form, wrong_answer_2: e.target.value })}
          placeholder="Wrong Answer 2"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <input
          required
          value={form.wrong_answer_3}
          onChange={(e) => setForm({ ...form, wrong_answer_3: e.target.value })}
          placeholder="Wrong Answer 3"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <select
          required
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          required
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <button type="submit" className="col-span-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded p-2 mt-2 font-semibold transition">
          <Plus className="inline-block mr-2" size={18} /> Add Question
        </button>
      </form>

      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-2">Question</th>
                <th className="p-2">Category</th>
                <th className="p-2">Difficulty</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.content_hash} className="border-b border-gray-700">
                  <td className="p-2">{q.question_text}</td>
                  <td className="p-2">{q.category?.name || q.category_id}</td>
                  <td className="p-2">{q.difficulty}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => handleEditQuestion(q)}
                      className="text-purple-400 hover:text-purple-500 mr-3"
                      title="Edit question"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.content_hash)}
                      className="text-red-400 hover:text-red-500"
                      title="Delete question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              currentPage === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
            }`}
          >
            Previous
          </button>
          
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              currentPage === totalPages
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderCategories = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Layers className="h-6 w-6 text-green-400" /> Manage Categories
      </h2>
      
      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="bg-[hsl(var(--card))] border border-purple-500/30 p-4 rounded-lg mb-6 grid gap-3 md:grid-cols-3">
        <input
          required
          value={categoryForm.name}
          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          placeholder="Category Name (e.g., Movies)"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <input
          value={categoryForm.description}
          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
          placeholder="Description (optional)"
          className="bg-gray-700/50 border border-purple-500/30 p-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded p-2 flex items-center justify-center gap-2 font-semibold transition">
          <Plus size={18} /> Add Category
        </button>
      </form>
      
      {loading ? (
        <p>Loading categories...</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.category_id}
              className="bg-[hsl(var(--card))] border border-purple-500/30 p-3 rounded flex justify-between items-center"
            >
              <span className="font-medium">{cat.name}</span>
              <span className="text-gray-400 text-sm">{cat.description || 'No description'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderUsers = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Users className="h-6 w-6 text-yellow-400" /> Manage Users
      </h2>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
            <tr>
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b border-gray-700">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2 text-right space-x-3">
                  <button
                    onClick={() => toggleUserRole(u.user_id, u.role)}
                    className="text-purple-400 hover:text-purple-500"
                    title="Toggle role"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.user_id, u.username)}
                    className="text-red-400 hover:text-red-500"
                    title="Delete user"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Real-time Presence Widget */}
      <div className="bg-[hsl(var(--card))] border border-purple-500/30 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Users Currently in Matches
        </h3>
        {activeUsers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeUsers.map((username, idx) => (
              <span key={idx} className="bg-purple-600/30 border border-purple-500/30 px-3 py-1 rounded-full text-sm">
                🎮 {username}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No users currently playing</p>
        )}
      </div>

      {/* TAB BUTTONS */}
      <div className="flex gap-4 mb-6 border-b border-purple-500/30 pb-2">
        <button
          onClick={() => setActiveTab("questions")}
          className={`pb-1 ${activeTab === "questions" ? "border-b-2 border-purple-500 text-purple-400" : "text-gray-400 hover:text-gray-200"}`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-1 ${activeTab === "categories" ? "border-b-2 border-purple-500 text-purple-400" : "text-gray-400 hover:text-gray-200"}`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-1 ${activeTab === "users" ? "border-b-2 border-purple-500 text-purple-400" : "text-gray-400 hover:text-gray-200"}`}
        >
          Users
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-[hsl(var(--muted))] p-4 rounded-xl shadow-lg border border-purple-500/30">
        {activeTab === "questions" && renderQuestions()}
        {activeTab === "categories" && renderCategories()}
        {activeTab === "users" && renderUsers()}
      </div>
    </div>
  );
}
