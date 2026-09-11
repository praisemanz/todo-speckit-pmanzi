<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();

const form = ref(null);
const username = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [(value) => !!value || "Password is required."];

const signIn = async () => {
  errorMessage.value = "";

  const { valid } = await form.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.loginUser({
      username: username.value,
      password: password.value,
    });

    Utils.setStore("user", response.data);
    router.push({ name: "home" });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Unable to sign in. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="fill-height justify-center">
    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="8" md="5">
        <v-card elevation="4" class="pa-4">
          <v-card-item>
            <v-card-title class="text-h5">Sign in</v-card-title>
          </v-card-item>

          <v-card-text>
            <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
              {{ errorMessage }}
            </v-alert>

            <v-form ref="form" @submit.prevent="signIn">
              <v-text-field
                v-model="username"
                name="username"
                label="Username"
                autocomplete="username"
                :rules="usernameRules"
              />

              <v-text-field
                v-model="password"
                name="password"
                label="Password"
                type="password"
                autocomplete="current-password"
                :rules="passwordRules"
              />

              <v-btn
                type="submit"
                color="primary"
                variant="elevated"
                class="oc-cta mt-2"
                block
                :loading="loading"
              >
                Sign in
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" color="secondary" :to="{ name: 'register' }">
              Create an account
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
