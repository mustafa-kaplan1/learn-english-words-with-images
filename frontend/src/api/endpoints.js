import api from "./axios";

// Auth
export const register = (email, password) =>
  api.post("/auth/register/", { email, password });

export const login = (email, password) =>
  api.post("/auth/login/", { email, password });

export const getProfile = () => api.get("/auth/profile/");

// Words
export const getWordSession = () => api.get("/words/session/");

export const updateScore = (word_id, action) =>
  api.patch("/words/score/", { word_id, action });

export const getWordImages = (word_id) =>
  api.get(`/words/images/${word_id}/`);

export const getLibrary = () => api.get("/words/library/");

export const getUserSettings = () => api.get("/auth/settings/");
export const updateUserSettings = (data) => api.patch("/auth/settings/", data);

export const reportWord = (word_id, faulty_images, translation_error) =>
  api.post("/words/report/", { word_id, faulty_images, translation_error });