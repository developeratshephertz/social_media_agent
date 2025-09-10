import { apiFetch, apiUrl } from "./api.js";

async function handleResponse(response) {
  const text = await response.text();
  try {
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const err = (json && (json.error || json.detail)) || response.statusText || "Request failed";
      throw new Error(err);
    }
    // If API uses { success: boolean } semantics, surface error when success === false
    if (json && Object.prototype.hasOwnProperty.call(json, "success") && json.success === false) {
      const err = json.error || json.message || "Request returned success=false";
      throw new Error(err);
    }
    return json;
  } catch (e) {
    // If JSON.parse failed but response.ok is true, return raw text
    if (response.ok) return text;
    throw e;
  }
}

// Post generation endpoints
export async function generatePost({ description, caption_provider, image_provider, platforms, subreddit } = {}) {
  const res = await apiFetch("/generate-post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, caption_provider, image_provider, platforms, subreddit }),
  });
  return handleResponse(res);
}

export async function generateBatch({ description, days, num_posts, caption_provider, image_provider, platforms, subreddit } = {}) {
  const res = await apiFetch("/generate-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, days, num_posts, caption_provider, image_provider, platforms, subreddit }),
  });
  return handleResponse(res);
}

// Posts / campaigns
export async function getPosts({ limit = 50 } = {}) {
  const res = await apiFetch(`/api/posts?limit=${encodeURIComponent(limit)}`);
  return handleResponse(res);
}

export async function createPost(postData = {}) {
  const res = await apiFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),
  });
  return handleResponse(res);
}

export async function updatePost(postId, updateData = {}) {
  const res = await apiFetch(`/api/posts/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  return handleResponse(res);
}

export async function deletePost(postId) {
  const res = await apiFetch(`/api/posts/${postId}`, { method: "DELETE" });
  return handleResponse(res);
}

// Calendar
export async function getCalendarEvents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/calendar/events${qs ? `?${qs}` : ""}`);
  return handleResponse(res);
}

export async function createCalendarEvent(eventData = {}) {
  const res = await apiFetch(`/api/calendar/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData),
  });
  return handleResponse(res);
}

export async function updateCalendarEvent(eventId, updateData = {}) {
  const res = await apiFetch(`/api/calendar/events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  return handleResponse(res);
}

export async function deleteCalendarEvent(eventId) {
  const res = await apiFetch(`/api/calendar/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// Google integrations (backend routes)
export async function getGoogleStatus() {
  const res = await apiFetch(`/google/status`);
  return handleResponse(res);
}

export async function saveCampaignToDrive(campaignData = {}) {
  const res = await apiFetch(`/google-drive/save-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campaignData),
  });
  return handleResponse(res);
}

export async function createGoogleCalendarEvent(data = {}) {
  const res = await apiFetch(`/google-calendar/create-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// Analytics / status
export async function getAnalyticsOverview() {
  const res = await apiFetch(`/api/analytics/overview`);
  return handleResponse(res);
}

export async function getAnalyticsPosts({ limit = 10 } = {}) {
  const res = await apiFetch(`/api/analytics/posts?limit=${encodeURIComponent(limit)}`);
  return handleResponse(res);
}

export async function getFollowers() {
  const res = await apiFetch(`/api/analytics/followers`);
  return handleResponse(res);
}

export async function getHealth() {
  const res = await apiFetch(`/health`);
  return handleResponse(res);
}

export async function getHero() {
  const res = await apiFetch(`/api/hero`);
  return handleResponse(res);
}

export async function getScheduledPosts() {
  const res = await apiFetch(`/api/scheduled-posts`);
  return handleResponse(res);
}

export async function getAllPosts({ limit = 50 } = {}) {
  const res = await apiFetch(`/api/posts?limit=${encodeURIComponent(limit)}`);
  return handleResponse(res);
}

export async function getSchedulerStatus() {
  const res = await apiFetch(`/api/scheduler/status`);
  return handleResponse(res);
}

export default {
  generatePost,
  generateBatch,
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getGoogleStatus,
  saveCampaignToDrive,
  createGoogleCalendarEvent,
  getAnalyticsOverview,
  getAnalyticsPosts,
  getFollowers,
  getHealth,
  getHero,
  getScheduledPosts,
  getAllPosts,
  getSchedulerStatus,
};


