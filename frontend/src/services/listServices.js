import apiClient from "./services.js";

export default {
  getLists() {
    return apiClient.get("lists");
  },

  createList(list) {
    return apiClient.post("lists", list);
  },

  updateList(listId, list) {
    return apiClient.put(`lists/${listId}`, list);
  },

  deleteList(listId) {
    return apiClient.delete(`lists/${listId}`);
  },
};
