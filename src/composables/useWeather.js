import { ref } from "vue";
import { getWeather } from "../api/apiService.js";

const STORAGE_DATA = "weather_data";
const STORAGE_HISTORY = "temp_history";
const MAX_HISTORY = 12;

export function useWeather() {
  const weatherList = ref([]);
  const tempHistory = ref({});
  const loading = ref(false);
  const errorMsg = ref("");

  /* ---------- storage ---------- */
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

  /* ---------- normalize ---------- */
  const normalize = (res) => ({
    city: res.location.name,
    country: res.location.country,
    tempC: res.current.temp_c,
    humidity: res.current.humidity,
    condition: res.current.condition.text,
    icon: `https:${res.current.condition.icon}`,
    updatedAt: new Date().toLocaleTimeString(),
  });

  /* ---------- actions ---------- */
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

      tempHistory.value[data.city] ??= [];

      tempHistory.value[data.city].push({
        temp: data.tempC,
        humidity: data.humidity,
        time: new Date().toLocaleTimeString(),
      });

      if (tempHistory.value[data.city].length > MAX_HISTORY)
        tempHistory.value[data.city].shift();

      save();
    } catch (e) {
      errorMsg.value = e.message || "City not found";
    } finally {
      loading.value = false;
    }
  };

  const refreshAll = async () => {
    if (!weatherList.value.length) return;

    try {
      loading.value = true;

      const res = await Promise.all(
        weatherList.value.map((w) => getWeather(w.city))
      );

      res.forEach((r) => {
        const city = r.location.name;

        tempHistory.value[city] ??= [];

        tempHistory.value[city].push({
          temp: r.current.temp_c,
          humidity: r.current.humidity,
          time: new Date().toLocaleTimeString(),
        });

        if (tempHistory.value[city].length > MAX_HISTORY)
          tempHistory.value[city].shift();
      });

      weatherList.value = res.map(normalize);
      save();
    } finally {
      loading.value = false;
    }
  };

  const removeCity = (city) => {
    weatherList.value = weatherList.value.filter((w) => w.city !== city);
    delete tempHistory.value[city];
    save();
  };

  const refreshCity = async (city) => {
    if (!city) return;

    try {
      const res = await getWeather(city);
      const data = normalize(res);

      const idx = weatherList.value.findIndex(
        (w) => w.city.toLowerCase() === city.toLowerCase()
      );

      if (idx !== -1) weatherList.value[idx] = data;

      tempHistory.value[city] ??= [];
      tempHistory.value[city].push({
        temp: data.tempC,
        humidity: data.humidity,
        time: new Date().toLocaleTimeString(),
      });

      if (tempHistory.value[city].length > MAX_HISTORY)
        tempHistory.value[city].shift();

      save();
    } catch (e) {
      console.error(e);
    }
  };

  return {
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
  };
}
