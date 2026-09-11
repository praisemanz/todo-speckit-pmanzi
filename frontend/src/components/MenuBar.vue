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
    user.value = null;
    signingOut.value = false;
    router.push({ name: "login" });
  }
};
</script>

<template>
  <v-app-bar color="primary" flat>
    <v-app-bar-title>Todo Speckit</v-app-bar-title>

    <template #append>
      <span v-if="user" class="mr-4">{{ user.fName }} {{ user.lName }}</span>

      <v-btn variant="text" class="oc-cta" :loading="signingOut" @click="signOut">
        Sign out
      </v-btn>
    </template>
  </v-app-bar>
</template>
