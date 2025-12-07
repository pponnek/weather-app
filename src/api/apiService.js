const KEY = import.meta.env.VITE_API_KEY

export async function getWeather(city) {
  const res = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${KEY}&q=${city}&aqi=no`
  )

  if (!res.ok) {
    throw new Error('City not found')
  }

  return res.json()
}