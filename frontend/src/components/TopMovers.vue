<script setup>
import { ref, onMounted, computed } from 'vue';
import { getTopMovers } from "../api";

const stocks = ref([]);
const loading = ref(true);

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    });
}

function directionFormat(dirStr) {
    if (dirStr === "up") {
        return "\u25B2";
    } else {
        return "\u25BC";
    }
}


function textColor(direction) {
    return direction === "up" ? 'green' : 'red';
}

onMounted(async () => {
    const result = await getTopMovers();
    stocks.value = result.data;
    loading.value = false;
})
</script>

<template>
    <div class="d-flex justify-center align-center">
      <v-card class="mx-auto" width="400" color="#f1f5f9" elevation="10">
        <v-card-title>Latest 7 stocks</v-card-title>
        <v-card-text>
          <div
            v-for="stock in stocks"
            :key="stock.date"
            class="d-flex justify-space-between align-center py-4 mx-5"
            style="display: flex; border-bottom: 2px solid rgba(0,0,0,0.08); gap: 10px;"
          >
            <span> {{ stock.symbol }} </span>
            <span :style="{ color: textColor(stock.direction)}"> {{ directionFormat(stock.direction) }} {{ stock.percentChange }}% </span>
            <span> {{ formatDate(stock.date) }} </span>
              
          </div>
        </v-card-text>
      </v-card>
    </div>
  </template>

<style scoped>
    .v-card-title {
    font-size: 1.5rem;
    }

    .v-card-text span {
    font-size: 1.1rem;
    }
</style>
