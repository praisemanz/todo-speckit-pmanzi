<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();

const user = ref(Utils.getStore("user"));
const signingOut = ref(false);

const signOut = async () => {
  signingOut.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    Utils.removeItem("user");
    signingOut.value = false;
    router.push({ name: "login" });
  }
};
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4 mb-2">Welcome, {{ user?.fName }}</h1>
    <p class="text-body-1 mb-6">You are signed in.</p>

    <v-btn
      color="primary"
      variant="elevated"
      class="oc-cta"
      :loading="signingOut"
      @click="signOut"
    >
      Sign out
    </v-btn>
  </v-container>
</template>
