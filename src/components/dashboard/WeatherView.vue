<script setup>
import { ref, computed, defineAsyncComponent } from "vue";
import { useWeather } from "../../composables/useWeather";

const WeatherChart = defineAsyncComponent(() => import("./WeatherChart.vue"));

/* ================= COMPOSABLE ================= */
const {
  weatherList,
  tempHistory,
  loading,
  errorMsg,

  globalPaused,

  fetchCity,
  refreshAll,
  removeCity,
  removeAll,
  startCityAutoRefresh,
  stopCityAutoRefresh,
  togglePause,

  MAX_HISTORY,
} = useWeather();

/* ================= UI STATE ================= */
const searchQuery = ref("");
const unit = ref("C");
const chartType = ref("line");

/* ================= TABLE ================= */
const rows = computed(() =>
  weatherList.value.map((w) => ({
    ...w,
    temp:
      unit.value === "C"
        ? w.tempC
        : Math.round((w.tempC * 9) / 5 + 32),
  }))
);

/* ================= HELPERS ================= */
const severity = (text = "") => {
  const c = text.toLowerCase();
  if (c.includes("sun") || c.includes("clear")) return "success";
  if (c.includes("cloud")) return "info";
  if (c.includes("rain") || c.includes("storm")) return "warn";
  return "secondary";
};

const countdownClass = (countdown, city) => {
  const s = countdown?.[city];
  if (!s) return "";
  if (s > 180) return "text-green-500";
  if (s > 60) return "text-yellow-500";
  return "text-red-500 font-bold animate-pulse";
};

/* ================= ACTIONS ================= */
const onRemoveAll = () => {
  if (!weatherList.value.length) return;
  if (!confirm("Hapus semua kota dan data cuaca?")) return;
  removeAll();
};
</script>

<template>
  <!-- ================= DASHBOARD ================= -->
  <div class="p-6 border rounded-xl flex flex-col gap-4">

    <div class="flex justify-between items-center">
      <span class="font-medium text-lg">Weather Dashboard</span>

      <div class="flex gap-2">
        <SelectButton :options="['C', 'F']" v-model="unit" />

        <Button
          icon="pi pi-refresh"
          label="Refresh All"
          severity="success"
          :loading="loading"
          :disabled="globalPaused"
          @click="refreshAll"
        />

        <Button
          icon="pi pi-trash"
          label="Hapus Semua"
          severity="danger"
          outlined
          :disabled="!weatherList.length"
          @click="onRemoveAll"
        />

        <Button
          :label="globalPaused ? 'Resume' : 'Pause All'"
          :severity="globalPaused ? 'success' : 'secondary'"
          @click="togglePause"
        />
      </div>
    </div>

    <!-- ================= SEARCH ================= -->
    <div class="flex gap-2">
      <InputText
        v-model="searchQuery"
        placeholder="Masukan Kota..."
        @keyup.enter="fetchCity(searchQuery)"
      />
      <Button
        label="Search"
        icon="pi pi-search"
        :loading="loading"
        @click="fetchCity(searchQuery)"
      />
    </div>

    <Message v-if="errorMsg" severity="error">
      {{ errorMsg }}
    </Message>

    <!-- ================= TABLE ================= -->
    <DataTable :value="rows" :loading="loading">
      <Column header="No">
        <template #body="{ index }">{{ index + 1 }}</template>
      </Column>

      <Column field="city" header="City" />
      <Column field="country" header="Country" />
      <Column :header="`Temp (°${unit})`" field="temp" />

      <Column header="Condition">
        <template #body="{ data }">
          <div class="flex gap-2 items-center">
            <img :src="data.icon" width="22" />
            <Tag :severity="severity(data.condition)">
              {{ data.condition }}
            </Tag>
          </div>
        </template>
      </Column>

      <Column field="humidity" header="Humidity (%)" />
      <Column field="updatedAt" header="Updated" />

      <!-- ================= ACTION ================= -->
      <Column header="Action">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-play"
              text
              severity="success"
              :disabled="globalPaused"
              @click="startCityAutoRefresh(data.city)"
            />
            <Button
              icon="pi pi-stop"
              text
              severity="secondary"
              @click="stopCityAutoRefresh(data.city)"
            />
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              @click="removeCity(data.city)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- ================= CHART ================= -->
  <div class="p-6 border rounded-xl flex flex-col gap-4 mt-4">
    <div class="flex justify-between items-center">
      <span class="font-medium text-lg">Weather Chart</span>
      <SelectButton v-model="chartType" :options="['line', 'area']" />
    </div>

    <Suspense>
      <WeatherChart
        :history="tempHistory"
        :unit="unit"
        :max="MAX_HISTORY"
        :chartType="chartType"
      />
    </Suspense>
  </div>
</template>
