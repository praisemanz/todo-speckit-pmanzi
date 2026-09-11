<script setup>
import { onMounted, ref } from "vue";
import listServices from "../services/listServices.js";
import ListItemsDialog from "../components/ListItemsDialog.vue";

const lists = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");

const addDialog = ref(false);
const renameDialog = ref(false);
const deleteDialog = ref(false);
const itemsDialog = ref(false);
const itemsList = ref(null);

const addForm = ref(null);
const renameForm = ref(null);

const newListName = ref("");
const renameListName = ref("");
const selectedList = ref(null);

const nameRules = [(value) => !!value?.trim() || "List name is required."];

const loadLists = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await listServices.getLists();
    lists.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not load your lists.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadLists);

const openAddDialog = () => {
  newListName.value = "";
  errorMessage.value = "";
  addDialog.value = true;
};

const createList = async () => {
  const { valid } = await addForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    await listServices.createList({ name: newListName.value });
    addDialog.value = false;
    await loadLists();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not create the list.";
  } finally {
    saving.value = false;
  }
};

const openItemsDialog = (list) => {
  itemsList.value = list;
  itemsDialog.value = true;
};

const openRenameDialog = (list) => {
  selectedList.value = list;
  renameListName.value = list.name;
  errorMessage.value = "";
  renameDialog.value = true;
};

const renameList = async () => {
  const { valid } = await renameForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    await listServices.updateList(selectedList.value.id, { name: renameListName.value });
    renameDialog.value = false;
    await loadLists();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not rename the list.";
  } finally {
    saving.value = false;
  }
};

const openDeleteDialog = (list) => {
  selectedList.value = list;
  errorMessage.value = "";
  deleteDialog.value = true;
};

const deleteList = async () => {
  saving.value = true;
  errorMessage.value = "";

  try {
    await listServices.deleteList(selectedList.value.id);
    deleteDialog.value = false;
    await loadLists();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not delete the list.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-container class="py-8">
    <v-card elevation="2">
      <v-card-item>
        <v-card-title class="text-h5">My Lists</v-card-title>

        <template #append>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddDialog">
            + New List
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text>
        <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-progress-linear v-if="loading" indeterminate color="primary" />

        <p v-else-if="lists.length === 0" class="text-body-1">
          No lists yet. Create your first list.
        </p>

        <v-list v-else>
          <v-list-item v-for="list in lists" :key="list.id" :title="list.name">
            <template #append>
              <v-btn
                icon="mdi-format-list-checks"
                variant="text"
                size="small"
                :aria-label="`View items for ${list.name}`"
                @click="openItemsDialog(list)"
              />

              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                aria-label="Edit list"
                @click="openRenameDialog(list)"
              />

              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                aria-label="Delete list"
                @click="openDeleteDialog(list)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <ListItemsDialog v-model="itemsDialog" :list="itemsList" />

    <v-dialog v-model="addDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">New list</v-card-title>

        <v-card-text>
          <v-form ref="addForm" @submit.prevent="createList">
            <v-text-field
              v-model="newListName"
              name="newListName"
              label="List name"
              :rules="nameRules"
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
            @click="createList"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Rename list</v-card-title>

        <v-card-text>
          <v-form ref="renameForm" @submit.prevent="renameList">
            <v-text-field
              v-model="renameListName"
              name="renameListName"
              label="List name"
              :rules="nameRules"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="renameDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="renameList"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Delete list</v-card-title>

        <v-card-text>
          Delete <strong>{{ selectedList?.name }}</strong>? This cannot be undone.
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="secondary" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            class="oc-cta"
            :loading="saving"
            @click="deleteList"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
