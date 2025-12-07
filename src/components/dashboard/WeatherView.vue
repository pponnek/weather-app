<script setup>
import { ref, onMounted, onBeforeUnmount, computed, defineAsyncComponent } from "vue";
import { useWeather } from "../../composables/useWeather";

const WeatherChart = defineAsyncComponent(() => import("./WeatherChart.vue"));

const {
    weatherList,
    tempHistory,
    loading,
    errorMsg,
    load,
    fetchCity,
    refreshCity,
    refreshAll,
    removeCity,
    MAX_HISTORY,
} = useWeather();

/* ================= STATE ================= */
const searchQuery = ref("");
const unit = ref("C");
const chartType = ref("line");

const REFRESH = 5 * 60 * 1000;

/* auto refresh */
const activeIntervals = ref({});
const countdown = ref({});
const globalPaused = ref(false);

let globalTimer;

/* ================= LIFECYCLE ================= */
onMounted(() => {
    load();
    globalTimer = setInterval(() => {
        if (!globalPaused.value) refreshAll();
    }, REFRESH);
});

onBeforeUnmount(() => {
    clearInterval(globalTimer);
    Object.values(activeIntervals.value).forEach(clearInterval);
});

/* ================= COMPUTED ================= */
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

const countdownClass = (city) => {
    const s = countdown.value[city];
    if (!s) return "";

    if (s > 180) return "text-green-500";
    if (s > 60) return "text-yellow-500";
    return "text-red-500 font-bold animate-pulse";
};

/* ================= AUTO REFRESH ================= */
const startCityAutoRefresh = (city, minutes = 10) => {
    if (globalPaused.value || activeIntervals.value[city]) return;

    countdown.value[city] = minutes * 60;

    activeIntervals.value[city] = setInterval(() => {
        refreshCity(city);
        countdown.value[city] = minutes * 60;
    }, minutes * 60 * 1000);

    const tick = setInterval(() => {
        if (!activeIntervals.value[city] || globalPaused.value) {
            clearInterval(tick);
            return;
        }
        countdown.value[city]--;
    }, 1000);
};

const stopCityAutoRefresh = (city) => {
    clearInterval(activeIntervals.value[city]);
    delete activeIntervals.value[city];
    delete countdown.value[city];
};

const toggleGlobalPause = () => {
    globalPaused.value = !globalPaused.value;

    if (globalPaused.value) {
        Object.values(activeIntervals.value).forEach(clearInterval);
        activeIntervals.value = {};
    }
};

const onRemoveCity = (city) => {
    stopCityAutoRefresh(city);
    removeCity(city);
};
</script>

<template>
    <div class="p-6 border rounded-xl flex flex-col gap-4">

        <div class="flex justify-between items-center">
            <span class="font-medium text-lg">Weather Dashboard</span>

            <div class="flex gap-2">
                <SelectButton :options="['C', 'F']" v-model="unit" />
                <Button
                    :label="globalPaused ? 'Resume' : 'Pause All'"
                    :severity="globalPaused ? 'success' : 'secondary'"
                    @click="toggleGlobalPause"
                />
            </div>
        </div>

        <!-- search -->
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

        <Message v-if="errorMsg" severity="error">{{ errorMsg }}</Message>

        <!-- table -->
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

            <!-- countdown -->
            <Column header="Next">
                <template #body="{ data }">
                    <span
                        v-if="countdown[data.city]"
                        :class="countdownClass(data.city)"
                    >
                        {{ Math.floor(countdown[data.city] / 60) }}:
                        {{ String(countdown[data.city] % 60).padStart(2, '0') }}
                    </span>
                    <span v-else>-</span>
                </template>
            </Column>

            <!-- actions -->
            <Column header="Action">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button
                            icon="pi pi-play"
                            text
                            severity="success"
                            :disabled="globalPaused || activeIntervals[data.city]"
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
                            @click="onRemoveCity(data.city)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- chart -->
    <div class="p-6 border rounded-xl flex flex-col gap-4">
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
