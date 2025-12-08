import { ref } from "vue";
import { getWeather } from "../api/apiService.js";

const STORAGE_DATA = "weather_data";
const STORAGE_HISTORY = "temp_history";
const MAX_HISTORY = 12;
const GLOBAL_REFRESH = 5 * 60 * 1000;

export function useWeather() {
  /* ================= STATE ================= */
  const weatherList = ref([]);
  const tempHistory = ref({});
  const loading = ref(false);
  const errorMsg = ref("");

  const globalPaused = ref(false);
  const activeIntervals = ref({});
  const countdown = ref({});

  let globalTimer = null;

  /* ================= STORAGE ================= */
  const save = () => {
    localStorage.setItem(STORAGE_DATA, JSON.stringify(weatherList.value));
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(tempHistory.value));
  };

  const load = () => {
    weatherList.value = JSON.parse(localStorage.getItem(STORAGE_DATA) || "[]");
    tempHistory.value = JSON.parse(
      localStorage.getItem(STORAGE_HISTORY) || "{}"
    );
  };

  /* ================= HELPERS ================= */
  const normalize = (res) => ({
    city: res.location.name,
    country: res.location.country,
    tempC: res.current.temp_c,
    humidity: res.current.humidity,
    condition: res.current.condition.text,
    icon: `https:${res.current.condition.icon}`,
    updatedAt: new Date().toLocaleTimeString(),
  });

  const pushHistory = (data) => {
    tempHistory.value[data.city] ??= [];
    tempHistory.value[data.city].push({
      temp: data.tempC,
      humidity: data.humidity,
      time: new Date().toLocaleTimeString(),
    });

    if (tempHistory.value[data.city].length > MAX_HISTORY) {
      tempHistory.value[data.city].shift();
    }
  };

  /* ================= ACTIONS ================= */
  const fetchCity = async (city) => {
    if (!city) return;
    loading.value = true;
    errorMsg.value = "";

    try {
      const res = await getWeather(city);
      const data = normalize(res);

      const idx = weatherList.value.findIndex(
        (w) => w.city.toLowerCase() === data.city.toLowerCase()
      );

      if (idx !== -1) weatherList.value[idx] = data;
      else weatherList.value.unshift(data);

      pushHistory(data);
      save();
    } catch (e) {
      errorMsg.value = e.message || "City not found";
    } finally {
      loading.value = false;
    }
  };

  const refreshCity = async (city) => {
    if (!city) return;

    try {
      const res = await getWeather(city);
      const data = normalize(res);

      const idx = weatherList.value.findIndex(
        (w) => w.city.toLowerCase() === city.toLowerCase()
      );

      if (idx !== -1) {
        weatherList.value[idx] = data;
        pushHistory(data);
        save();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = async () => {
    if (!weatherList.value.length || globalPaused.value) return;

    loading.value = true;

    try {
      await Promise.all(
        weatherList.value.map((w) => refreshCity(w.city))
      );
    } finally {
      loading.value = false;
    }
  };

  /* ================= AUTO REFRESH ================= */
  const startGlobalRefresh = () => {
    if (globalTimer) return;

    globalTimer = setInterval(refreshAll, GLOBAL_REFRESH);
  };

  const stopGlobalRefresh = () => {
    clearInterval(globalTimer);
    globalTimer = null;
  };

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

  /* ================= GLOBAL CONTROL ================= */
  const togglePause = () => {
    globalPaused.value = !globalPaused.value;

    if (globalPaused.value) {
      stopGlobalRefresh();
      Object.values(activeIntervals.value).forEach(clearInterval);
      activeIntervals.value = {};
    } else {
      refreshAll();
      startGlobalRefresh();
    }
  };

  const removeCity = (city) => {
    stopCityAutoRefresh(city);
    weatherList.value = weatherList.value.filter((w) => w.city !== city);
    delete tempHistory.value[city];
    save();
  };

  const removeAll = () => {
    Object.values(activeIntervals.value).forEach(clearInterval);
    activeIntervals.value = {};
    countdown.value = {};

    weatherList.value = [];
    tempHistory.value = {};
    save();
  };

  /* ================= INIT ================= */
  load();
  startGlobalRefresh();

  return {
    weatherList,
    tempHistory,
    loading,
    errorMsg,

    globalPaused,
    activeIntervals,
    countdown,

    fetchCity,
    refreshCity,
    refreshAll,
    startCityAutoRefresh,
    stopCityAutoRefresh,

    togglePause,
    removeCity,
    removeAll,

    MAX_HISTORY,
  };
}
