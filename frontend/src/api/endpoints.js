import api from "./axios";

// Auth
export const registerStep1 = (email) =>
  api.post("/auth/register/step1/", { email });

export const registerStep2 = (token) =>
  api.post("/auth/register/step2/", { token });

export const registerStep3 = (token, password, first_name, last_name, level) =>
  api.post("/auth/register/step3/", { token, password, first_name, last_name, level });

export const login = (email, password) =>
  api.post("/auth/login/", { email, password });

export const getProfile = () => api.get("/auth/profile/");
export const updateProfile = (data) => api.patch("/auth/profile/", data);

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password/", { email });

export const resetPassword = (token, new_password) =>
  api.post("/auth/reset-password/", { token, new_password });

// Settings
export const getUserSettings = () => api.get("/auth/settings/");
export const updateUserSettings = (data) => api.patch("/auth/settings/", data);

// Words
export const getWordSession = () => api.get("/words/session/");
export const updateScore = (word_id, action) =>
  api.patch("/words/score/", { word_id, action });
export const getWordImages = (word_id) =>
  api.get(`/words/images/${word_id}/`);
export const getLibrary = () => api.get("/words/library/");
export const reportWord = (word_id, faulty_images, translation_error) =>
  api.post("/words/report/", { word_id, faulty_images, translation_error });