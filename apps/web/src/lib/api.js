const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
export function getToken() {
    return localStorage.getItem('memex_token');
}
export function setToken(token) {
    localStorage.setItem('memex_token', token);
}
export function clearToken() {
    localStorage.removeItem('memex_token');
}
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
    };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    try {
        const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
        const json = await response.json();
        if (!response.ok) {
            return { data: null, error: json.error ?? { code: 'UNKNOWN', message: 'Something went wrong' } };
        }
        return { data: json.data, error: null };
    }
    catch {
        return { data: null, error: { code: 'NETWORK_ERROR', message: 'Cannot reach Memex server' } };
    }
}
export const authApi = {
    async login(email, password) {
        return apiFetch('/api/auth/login', {
            method: 'POST', body: JSON.stringify({ email, password }),
        });
    },
    async signup(email, password, name) {
        return apiFetch('/api/auth/signup', {
            method: 'POST', body: JSON.stringify({ email, password, name }),
        });
    },
    async me() { return apiFetch('/api/auth/me'); },
    async logout() { return apiFetch('/api/auth/logout', { method: 'POST' }); },
};
export const bookmarksApi = {
    async list(params) {
        const q = new URLSearchParams();
        if (params?.search)
            q.set('search', params.search);
        if (params?.tag)
            q.set('tag', params.tag);
        if (params?.collectionId)
            q.set('collectionId', params.collectionId);
        if (params?.page)
            q.set('page', String(params.page));
        const qs = q.toString();
        return apiFetch(`/api/bookmarks${qs ? `?${qs}` : ''}`);
    },
    async getOne(id) {
        return apiFetch(`/api/bookmarks/${id}`);
    },
    async listArchived() {
        return apiFetch('/api/bookmarks?archived=true');
    },
    async archive(id) {
        return apiFetch(`/api/bookmarks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isArchived: true }),
        });
    },
    async unarchive(id) {
        return apiFetch(`/api/bookmarks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isArchived: false }),
        });
    },
    async delete(id) {
        return apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
    },
    async update(id, input) {
        return apiFetch(`/api/bookmarks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
    },
};
export const tagsApi = {
    async list() { return apiFetch('/api/tags'); },
};
export const collectionsApi = {
    async list() { return apiFetch('/api/collections'); },
    async getOne(id) {
        return apiFetch(`/api/collections/${id}`);
    },
    async create(input) {
        return apiFetch('/api/collections', {
            method: 'POST', body: JSON.stringify(input),
        });
    },
    async delete(id) {
        return apiFetch(`/api/collections/${id}`, { method: 'DELETE' });
    },
    async addBookmark(collectionId, bookmarkId) {
        return apiFetch(`/api/collections/${collectionId}/bookmarks`, {
            method: 'POST', body: JSON.stringify({ bookmarkId }),
        });
    },
    async removeBookmark(collectionId, bookmarkId) {
        return apiFetch(`/api/collections/${collectionId}/bookmarks/${bookmarkId}`, {
            method: 'DELETE',
        });
    },
};
export const searchApi = {
    async search(query) {
        return apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
    },
};
export const topicsApi = {
    async list() {
        return apiFetch('/api/topics');
    },
    async create(input) {
        return apiFetch('/api/topics', {
            method: 'POST', body: JSON.stringify(input),
        });
    },
    async getOne(id) {
        return apiFetch(`/api/topics/${id}`);
    },
    async update(id, input) {
        return apiFetch(`/api/topics/${id}`, {
            method: 'PATCH', body: JSON.stringify(input),
        });
    },
    async delete(id) {
        return apiFetch(`/api/topics/${id}`, { method: 'DELETE' });
    },
    async saveBlocks(id, blocks) {
        return apiFetch(`/api/topics/${id}/blocks`, {
            method: 'PUT', body: JSON.stringify({ blocks }),
        });
    },
    async addReference(topicId, bookmarkId, note) {
        return apiFetch(`/api/topics/${topicId}/references`, {
            method: 'POST', body: JSON.stringify({ bookmarkId, note }),
        });
    },
    async removeReference(topicId, bookmarkId) {
        return apiFetch(`/api/topics/${topicId}/references/${bookmarkId}`, {
            method: 'DELETE',
        });
    },
    async connect(fromId, toId, label) {
        return apiFetch(`/api/topics/${fromId}/connections`, {
            method: 'POST', body: JSON.stringify({ toTopicId: toId, label }),
        });
    },
    async disconnect(fromId, toId) {
        return apiFetch(`/api/topics/${fromId}/connections/${toId}`, {
            method: 'DELETE',
        });
    },
};
export const graphApi = {
    async getTopicGraph() {
        return apiFetch('/api/topics/graph');
    },
};
export const readingApi = {
    async list(filter = 'unread') {
        return apiFetch(`/api/reading?filter=${filter}`);
    },
    async add(bookmarkId) {
        return apiFetch('/api/reading', {
            method: 'POST',
            body: JSON.stringify({ bookmarkId }),
        });
    },
    async markRead(bookmarkId, isRead) {
        return apiFetch(`/api/reading/${bookmarkId}`, {
            method: 'PATCH',
            body: JSON.stringify({ isRead }),
        });
    },
    async remove(bookmarkId) {
        return apiFetch(`/api/reading/${bookmarkId}`, { method: 'DELETE' });
    },
};
export const digestApi = {
    async sendDigest() {
        return apiFetch('/api/digest/send', { method: 'POST' });
    },
};
export const publicApi = {
    async getTopic(username, slug) {
        return apiFetch(`/p/${username}/topic/${slug}`);
    },
    async getCollection(username, slug) {
        return apiFetch(`/p/${username}/collection/${slug}`);
    },
    async getProfile(username) {
        return apiFetch(`/p/${username}`);
    },
};
export const profileApi = {
    async getStats() {
        return apiFetch('/api/auth/stats');
    },
    async updateProfile(input) {
        return apiFetch('/api/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(input),
        });
    },
    async changePassword(currentPassword, newPassword) {
        return apiFetch('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },
    async uploadAvatar(imageDataUrl) {
        return apiFetch('/api/auth/avatar', {
            method: 'POST',
            body: JSON.stringify({ imageDataUrl }),
        });
    },
};
export const adminApi = {
    async getStats() {
        return apiFetch('/api/admin/stats');
    },
    async getUsers(page = 1) {
        return apiFetch(`/api/admin/users?page=${page}`);
    },
    async deleteUser(id) {
        return apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    },
};
export const attachmentsApi = {
    async update(id, content) {
        return apiFetch(`/api/attachments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ content }),
        });
    },
};
export const feedbackApi = {
    async submit(input) {
        return apiFetch('/api/feedback', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    },
};
