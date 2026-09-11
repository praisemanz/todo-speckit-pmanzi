<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();

const form = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");

const fNameRules = [(value) => !!value?.trim() || "First name is required."];
const lNameRules = [(value) => !!value?.trim() || "Last name is required."];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [
  (value) => (value?.length ?? 0) >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => value === password.value || "Passwords do not match.",
];

const createAccount = async () => {
  errorMessage.value = "";

  const { valid } = await form.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.registerUser({
      fName: fName.value,
      lName: lName.value,
      email: email.value,
      username: username.value,
      password: password.value,
    });

    Utils.setStore("user", response.data);
    router.push({ name: "home" });
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || "Unable to create the account. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="fill-height justify-center">
    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="10" md="6">
        <v-card elevation="4" class="pa-4">
          <v-card-item>
            <v-card-title class="text-h5">Create account</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
              {{ errorMessage }}
            </v-alert>

            <v-form ref="form" @submit.prevent="createAccount">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="fName"
                    name="fName"
                    label="First name"
                    :rules="fNameRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="lName"
                    name="lName"
                    label="Last name"
                    :rules="lNameRules"
                  />
                </v-col>
              </v-row>

              <v-text-field v-model="email" name="email" label="Email" :rules="emailRules" />

              <v-text-field
                v-model="username"
                name="username"
                label="Username"
                :rules="usernameRules"
              />

              <v-text-field
                v-model="password"
                name="password"
                label="Password"
                type="password"
                :rules="passwordRules"
              />

              <v-text-field
                v-model="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                type="password"
                :rules="confirmPasswordRules"
              />

              <v-btn
                type="submit"
                color="primary"
                variant="elevated"
                class="oc-cta mt-2"
                block
                :loading="loading"
              >
                Create account
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" color="secondary" :to="{ name: 'login' }">
              Already have an account? Sign in
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
