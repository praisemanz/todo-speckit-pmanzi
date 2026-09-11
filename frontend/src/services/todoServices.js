import apiClient from "./services.js";

export default {
  getTodos(listId) {
    return apiClient.get(`lists/${listId}/todos`);
  },

  createTodo(listId, todo) {
    return apiClient.post(`lists/${listId}/todos`, todo);
  },

  updateTodo(todoId, todo) {
    return apiClient.put(`todos/${todoId}`, todo);
  },

  deleteTodo(todoId) {
    return apiClient.delete(`todos/${todoId}`);
  },
};
