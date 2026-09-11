<script setup>
import { ref, watch } from "vue";
import todoServices from "../services/todoServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  list: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const todos = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");

const addDialog = ref(false);
const editDialog = ref(false);
const deleteDialog = ref(false);

const addForm = ref(null);
const editForm = ref(null);

const newTodoTitle = ref("");
const editTodoTitle = ref("");
const selectedTodo = ref(null);

const titleRules = [(value) => !!value?.trim() || "Todo title is required."];

const loadTodos = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await todoServices.getTodos(props.list.id);
    todos.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not load todos.";
  } finally {
    loading.value = false;
  }
};

// Each open fetches only the todos for the list the row belongs to.
watch(
  () => props.modelValue,
  (open) => {
    if (open && props.list) {
      todos.value = [];
      loadTodos();
    }
  },
  { immediate: true }
);

const close = () => emit("update:modelValue", false);

const openAddDialog = () => {
  newTodoTitle.value = "";
  errorMessage.value = "";
  addDialog.value = true;
};

const addTodo = async () => {
  const { valid } = await addForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    await todoServices.createTodo(props.list.id, { title: newTodoTitle.value });
    addDialog.value = false;
    await loadTodos();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not add the todo.";
  } finally {
    saving.value = false;
  }
};

const toggleCompleted = async (todo, completed) => {
  errorMessage.value = "";

  try {
    await todoServices.updateTodo(todo.id, { completed });
    await loadTodos();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not update the todo.";
  }
};

const openEditDialog = (todo) => {
  selectedTodo.value = todo;
  editTodoTitle.value = todo.title;
  errorMessage.value = "";
  editDialog.value = true;
};

const editTodo = async () => {
  const { valid } = await editForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    await todoServices.updateTodo(selectedTodo.value.id, { title: editTodoTitle.value });
    editDialog.value = false;
    await loadTodos();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not update the todo.";
  } finally {
    saving.value = false;
  }
};

const openDeleteDialog = (todo) => {
  selectedTodo.value = todo;
  errorMessage.value = "";
  deleteDialog.value = true;
};

const deleteTodo = async () => {
  saving.value = true;
  errorMessage.value = "";

  try {
    await todoServices.deleteTodo(selectedTodo.value.id);
    deleteDialog.value = false;
    await loadTodos();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not delete the todo.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-item>
        <v-card-title class="text-h6">{{ list?.name }} — Items</v-card-title>

        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddDialog">
            + Add Item
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text>
        <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-progress-linear v-if="loading" indeterminate color="primary" />

        <p v-else-if="todos.length === 0" class="text-body-1">No todos in this list yet.</p>

        <v-list v-else>
          <v-list-item v-for="todo in todos" :key="todo.id">
            <template #prepend>
              <v-checkbox-btn
                :model-value="todo.completed"
                :aria-label="`Toggle ${todo.title}`"
                @update:model-value="toggleCompleted(todo, $event)"
              />
            </template>

            <v-list-item-title :class="{ 'text-decoration-line-through': todo.completed }">
              {{ todo.title }}
            </v-list-item-title>

            <template #append>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                aria-label="Edit todo"
                @click="openEditDialog(todo)"
              />

              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                aria-label="Delete todo"
                @click="openDeleteDialog(todo)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="secondary" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="addDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Add item</v-card-title>

        <v-card-text>
          <v-form ref="addForm" @submit.prevent="addTodo">
            <v-text-field
              v-model="newTodoTitle"
              name="newTodoTitle"
              label="Todo title"
              :rules="titleRules"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="addDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="addTodo"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Edit item</v-card-title>

        <v-card-text>
          <v-form ref="editForm" @submit.prevent="editTodo">
            <v-text-field
              v-model="editTodoTitle"
              name="editTodoTitle"
              label="Todo title"
              :rules="titleRules"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="editTodo"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Delete item</v-card-title>

        <v-card-text>
          Delete <strong>{{ selectedTodo?.title }}</strong>? This cannot be undone.
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="deleteTodo"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>
