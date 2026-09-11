<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();

const user = ref(Utils.getStore("user"));
const profileMenu = ref(false);
const editDialog = ref(false);
const signingOut = ref(false);
const saving = ref(false);
const errorMessage = ref("");

const editForm = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");

const fullName = computed(() => [user.value?.fName, user.value?.lName].filter(Boolean).join(" "));

const fNameRules = [(value) => !!value?.trim() || "First name is required."];
const lNameRules = [(value) => !!value?.trim() || "Last name is required."];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
// Password is optional here — an empty field means "leave my password alone".
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => value === password.value || "Passwords do not match.",
];

const openEditDialog = async () => {
  errorMessage.value = "";
  password.value = "";
  confirmPassword.value = "";
  editDialog.value = true;

  try {
    const response = await userServices.getUser(user.value.userId);
    fName.value = response.data.fName;
    lName.value = response.data.lName;
    email.value = response.data.email;
    username.value = response.data.username;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not load your profile.";
  }
};

const cancelEdit = () => {
  editDialog.value = false;
};

const saveProfile = async () => {
  const { valid } = await editForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  const payload = {
    fName: fName.value,
    lName: lName.value,
    email: email.value,
    username: username.value,
  };

  if (password.value) {
    payload.password = password.value;
  }

  try {
    const response = await userServices.updateUser(user.value.userId, payload);

    // Keep the session token and id; refresh only the display fields.
    const refreshed = {
      ...user.value,
      fName: response.data.fName,
      lName: response.data.lName,
      email: response.data.email,
      username: response.data.username,
      role: response.data.role,
    };

    Utils.setStore("user", refreshed);
    user.value = refreshed;
    window.dispatchEvent(new CustomEvent("user-logged-in"));

    editDialog.value = false;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Could not save your profile.";
  } finally {
    saving.value = false;
  }
};

const logOut = async () => {
  signingOut.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    Utils.removeItem("user");
    user.value = null;
    signingOut.value = false;
    profileMenu.value = false;
    router.push({ name: "login" });
  }
};
</script>

<template>
  <v-app-bar color="primary" flat>
    <v-app-bar-title>Todo Speckit</v-app-bar-title>

    <template #append>
      <v-menu v-model="profileMenu" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props }">
          <v-btn icon="mdi-account-circle" variant="text" aria-label="Profile" v-bind="props" />
        </template>

        <v-card min-width="280">
          <v-list>
            <v-list-item :title="fullName">
              <v-list-item-subtitle>{{ user?.username }}</v-list-item-subtitle>
              <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider />

          <v-card-actions>
            <v-btn color="primary" variant="elevated" class="oc-cta" @click="openEditDialog">
              Edit Profile
            </v-btn>

            <v-spacer />

            <v-btn
              color="secondary"
              variant="text"
              class="oc-cta"
              :loading="signingOut"
              @click="logOut"
            >
              Log out
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </template>
  </v-app-bar>

  <v-dialog v-model="editDialog" max-width="560">
    <v-card>
      <v-card-title class="text-h6">Edit Profile</v-card-title>

      <v-card-text>
        <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-form ref="editForm" @submit.prevent="saveProfile">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="fName"
                name="profileFName"
                label="First name"
                :rules="fNameRules"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="lName"
                name="profileLName"
                label="Last name"
                :rules="lNameRules"
              />
            </v-col>
          </v-row>

          <v-text-field v-model="email" name="profileEmail" label="Email" :rules="emailRules" />

          <v-text-field
            v-model="username"
            name="profileUsername"
            label="Username"
            :rules="usernameRules"
          />

          <v-text-field
            v-model="password"
            name="profilePassword"
            label="New password (optional)"
            type="password"
            :rules="passwordRules"
          />

          <v-text-field
            v-model="confirmPassword"
            name="profileConfirmPassword"
            label="Confirm new password"
            type="password"
            :rules="confirmPasswordRules"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="secondary" @click="cancelEdit">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          class="oc-cta"
          :loading="saving"
          @click="saveProfile"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
