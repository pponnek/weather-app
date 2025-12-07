<script setup>
import {ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
    history: {
        type: Object, // { Jakarta: [30,31,32], Bandung: [...] }
        required: true,
    },
    unit: {
        type: String,
        default: "C",
    },
    max: {
        type: Number,
        default: 12,
    },
        chartType: {
        type: String,
        default: "line", // line | area
    },
});

/* ------------ DATA ------------ */
const chartData = computed(() => {
    const documentStyle = getComputedStyle(document.documentElement);

    const colors = [
        documentStyle.getPropertyValue("--p-cyan-500"),
        documentStyle.getPropertyValue("--p-orange-500"),
        documentStyle.getPropertyValue("--p-green-500"),
        documentStyle.getPropertyValue("--p-purple-500"),
    ];

    const labels = Array.from({ length: props.max }, (_, i) => i + 1);

    return {
        labels,
        datasets: Object.entries(props.history).map(([city, points], idx) => ({
            label: city,
            data: points.map(p =>
                props.unit === "C"
                    ? p.temp
                    : Math.round((p.temp * 9) / 5 + 32)
            ),
            fill: props.chartType === "area",
            tension: 0.4,
            borderColor: colors[idx % colors.length],
            backgroundColor:
                props.chartType === "area"
                    ? colors[idx % colors.length] + "33"
                    : undefined,
            meta: points, // 🔑 penting untuk tooltip
        })),
    };
});


/* ------------ OPTIONS ------------ */
const chartOptions = computed(() => {
    const documentStyle = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");


    return {
        maintainAspectRatio: false,
        plugins: {
        tooltip: {
            callbacks: {
                label: (ctx) => {
                    const meta = ctx.dataset.meta[ctx.dataIndex];
                    return [
                        `Temp: ${ctx.formattedValue}°${props.unit}`,
                        `Humidity: ${meta.humidity}%`,
                        `Time: ${meta.time}`,
                    ];
                },
            },
        },
        legend: {
            labels: {
                color: getComputedStyle(document.documentElement)
                    .getPropertyValue("--p-text-color"),
            },
        },
        },
        scales: {
            x: {
                ticks: {
                    color: isDark ? "#9CA3AF" : "#6B7280",
                },
                grid: {
                    color: isDark
                        ? "rgba(255,255,255,0.05)" // ✅ DI SINI
                        : "rgba(0,0,0,0.08)",
                },
            },
            y: {
                ticks: {
                    color: isDark ? "#9CA3AF" : "#6B7280",
                },
                grid: {
                    color: isDark
                        ? "rgba(255,255,255,0.05)" // ✅ DAN DI SINI
                        : "rgba(0,0,0,0.08)",
                },
            },
        },
    };
});
</script>

<template>
    <div class="card">
        <Chart
            type="line"
            :data="chartData"
            :options="chartOptions"
            class="h-[30rem]"
        />
    </div>
</template>


