import api from "./axios";

// Auth
export const register = (email, password) =>
  api.post("/auth/register/", { email, password });

export const login = (email, password) =>
  api.post("/auth/login/", { email: email, password });

export const getProfile = () => api.get("/auth/profile/");

// Words
export const getWordSession = () => api.get("/words/session/");

export const updateScore = (word_id, action) =>
  api.patch("/words/score/", { word_id, action });

export const getWordImages = (word_id) =>
  api.get(`/words/images/${word_id}/`);

export const getLibrary = () => api.get("/words/library/");