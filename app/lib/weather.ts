import { z } from "zod";

export type LocationChoice = {
  id: string;
  name: string;
  detail?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  source: "gps" | "search" | "fallback";
};

export type FlightStatus = "good" | "marginal" | "no-go";

export type FlightVerdict = {
  status: FlightStatus;
  title: string;
  score: number;
  reasons: string[];
  cautions: string[];
};

export type WeatherSample = {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  pressure: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  weatherLabel: string;
  cloudCover: number | null;
  visibility: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  cape: number | null;
  uvIndex: number | null;
  europeanAqi: number | null;
  usAqi: number | null;
  pm10: number | null;
  pm25: number | null;
  isDay: boolean | null;
};

export type CurrentSnapshot = {
  location: LocationChoice;
  timezone: string;
  elevation: number | null;
  sample: WeatherSample;
  verdict: FlightVerdict;
  sources: string[];
};

export type DayForecast = {
  date: string;
  location: LocationChoice;
  timezone: string;
  daily: {
    weatherCode: number | null;
    weatherLabel: string;
    temperatureMax: number | null;
    temperatureMin: number | null;
    precipitationSum: number | null;
    precipitationProbabilityMax: number | null;
    windSpeedMax: number | null;
    windGustsMax: number | null;
    uvIndexMax: number | null;
    sunrise: string | null;
    sunset: string | null;
  };
  samples: WeatherSample[];
  best: {
    sample: WeatherSample | null;
    verdict: FlightVerdict;
  };
  topWindows: Array<{
    sample: WeatherSample;
    verdict: FlightVerdict;
  }>;
  sources: string[];
};

const nullableNumber = z.number().nullable();

const CurrentForecastSchema = z.object({
  timezone: z.string(),
  elevation: z.number().nullable().optional(),
  current: z.object({
    time: z.string(),
    temperature_2m: nullableNumber,
    relative_humidity_2m: nullableNumber,
    apparent_temperature: nullableNumber,
    is_day: nullableNumber,
    precipitation: nullableNumber,
    rain: nullableNumber,
    showers: nullableNumber,
    snowfall: nullableNumber,
    weather_code: nullableNumber,
    cloud_cover: nullableNumber,
    surface_pressure: nullableNumber,
    visibility: nullableNumber,
    wind_speed_10m: nullableNumber,
    wind_direction_10m: nullableNumber,
    wind_gusts_10m: nullableNumber,
    cape: nullableNumber,
  }),
});

const CurrentAirSchema = z.object({
  current: z.object({
    european_aqi: nullableNumber,
    us_aqi: nullableNumber,
    pm10: nullableNumber,
    pm2_5: nullableNumber,
    uv_index: nullableNumber,
  }),
});

const ForecastDaySchema = z.object({
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(nullableNumber),
    temperature_2m_max: z.array(nullableNumber),
    temperature_2m_min: z.array(nullableNumber),
    precipitation_sum: z.array(nullableNumber),
    precipitation_probability_max: z.array(nullableNumber),
    wind_speed_10m_max: z.array(nullableNumber),
    wind_gusts_10m_max: z.array(nullableNumber),
    uv_index_max: z.array(nullableNumber),
    sunrise: z.array(z.string().nullable()),
    sunset: z.array(z.string().nullable()),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(nullableNumber),
    relative_humidity_2m: z.array(nullableNumber),
    apparent_temperature: z.array(nullableNumber),
    precipitation_probability: z.array(nullableNumber),
    precipitation: z.array(nullableNumber),
    weather_code: z.array(nullableNumber),
    cloud_cover: z.array(nullableNumber),
    visibility: z.array(nullableNumber),
    surface_pressure: z.array(nullableNumber),
    wind_speed_10m: z.array(nullableNumber),
    wind_direction_10m: z.array(nullableNumber),
    wind_gusts_10m: z.array(nullableNumber),
    cape: z.array(nullableNumber),
    is_day: z.array(nullableNumber),
  }),
});

const AirDaySchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    european_aqi: z.array(nullableNumber),
    us_aqi: z.array(nullableNumber),
    pm10: z.array(nullableNumber),
    pm2_5: z.array(nullableNumber),
    uv_index: z.array(nullableNumber),
  }),
});

const GeocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});

async function requestJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Serviciul meteo a raspuns cu status ${response.status}`);
  }

  return schema.parse(await response.json());
}

function forecastUrl(location: LocationChoice, params: Record<string, string>) {
  const search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "auto",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    ...params,
  });

  return `https://api.open-meteo.com/v1/forecast?${search.toString()}`;
}

function airUrl(location: LocationChoice, params: Record<string, string>) {
  const search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "auto",
    ...params,
  });

  return `https://air-quality-api.open-meteo.com/v1/air-quality?${search.toString()}`;
}

export async function searchLocations(query: string): Promise<LocationChoice[]> {
  const trimmed = query.trim();

  if (trimmed.length < 3) {
    return [];
  }

  const search = new URLSearchParams({
    name: trimmed,
    count: "6",
    language: "ro",
    format: "json",
  });
  const data = await requestJson(
    `https://geocoding-api.open-meteo.com/v1/search?${search.toString()}`,
    GeocodingSchema,
  );

  return (data.results ?? []).map((place) => ({
    id: String(place.id),
    name: place.name,
    detail: [place.admin1, place.country].filter(Boolean).join(", "),
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    source: "search",
  }));
}

export async function fetchCurrentSnapshot(
  location: LocationChoice,
): Promise<CurrentSnapshot> {
  const [forecast, air] = await Promise.all([
    requestJson(
      forecastUrl(location, {
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "is_day",
          "precipitation",
          "rain",
          "showers",
          "snowfall",
          "weather_code",
          "cloud_cover",
          "surface_pressure",
          "visibility",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "cape",
        ].join(","),
      }),
      CurrentForecastSchema,
    ),
    requestJson(
      airUrl(location, {
        current: "european_aqi,us_aqi,pm10,pm2_5,uv_index",
      }),
      CurrentAirSchema,
    ),
  ]);

  const sample: WeatherSample = {
    time: forecast.current.time,
    temperature: forecast.current.temperature_2m,
    apparentTemperature: forecast.current.apparent_temperature,
    humidity: forecast.current.relative_humidity_2m,
    pressure: forecast.current.surface_pressure,
    precipitation:
      (forecast.current.precipitation ?? 0) +
      (forecast.current.rain ?? 0) +
      (forecast.current.showers ?? 0) +
      (forecast.current.snowfall ?? 0),
    precipitationProbability: null,
    weatherCode: forecast.current.weather_code,
    weatherLabel: weatherCodeLabel(forecast.current.weather_code),
    cloudCover: forecast.current.cloud_cover,
    visibility: forecast.current.visibility,
    windSpeed: forecast.current.wind_speed_10m,
    windDirection: forecast.current.wind_direction_10m,
    windGusts: forecast.current.wind_gusts_10m,
    cape: forecast.current.cape,
    uvIndex: air.current.uv_index,
    europeanAqi: air.current.european_aqi,
    usAqi: air.current.us_aqi,
    pm10: air.current.pm10,
    pm25: air.current.pm2_5,
    isDay:
      forecast.current.is_day === null ? null : forecast.current.is_day === 1,
  };

  return {
    location,
    timezone: forecast.timezone,
    elevation: forecast.elevation ?? null,
    sample,
    verdict: evaluateFlight(sample),
    sources: [
      "Open-Meteo Forecast",
      "Open-Meteo Air Quality",
      location.source === "gps" ? "Browser GPS" : "Open-Meteo Geocoding",
    ],
  };
}

export async function fetchDayForecast(
  location: LocationChoice,
  date: string,
): Promise<DayForecast> {
  const [forecast, air] = await Promise.all([
    requestJson(
      forecastUrl(location, {
        start_date: date,
        end_date: date,
        hourly: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation_probability",
          "precipitation",
          "weather_code",
          "cloud_cover",
          "visibility",
          "surface_pressure",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "cape",
          "is_day",
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "precipitation_probability_max",
          "wind_speed_10m_max",
          "wind_gusts_10m_max",
          "uv_index_max",
          "sunrise",
          "sunset",
        ].join(","),
      }),
      ForecastDaySchema,
    ),
    requestJson(
      airUrl(location, {
        start_date: date,
        end_date: date,
        hourly: "european_aqi,us_aqi,pm10,pm2_5,uv_index",
      }),
      AirDaySchema,
    ),
  ]);

  const airByTime = new Map<string, number>();
  air.hourly.time.forEach((time, index) => airByTime.set(time, index));

  const samples = forecast.hourly.time.map((time, index) => {
    const airIndex = airByTime.get(time);

    return {
      time,
      temperature: forecast.hourly.temperature_2m[index] ?? null,
      apparentTemperature:
        forecast.hourly.apparent_temperature[index] ?? null,
      humidity: forecast.hourly.relative_humidity_2m[index] ?? null,
      pressure: forecast.hourly.surface_pressure[index] ?? null,
      precipitation: forecast.hourly.precipitation[index] ?? null,
      precipitationProbability:
        forecast.hourly.precipitation_probability[index] ?? null,
      weatherCode: forecast.hourly.weather_code[index] ?? null,
      weatherLabel: weatherCodeLabel(forecast.hourly.weather_code[index]),
      cloudCover: forecast.hourly.cloud_cover[index] ?? null,
      visibility: forecast.hourly.visibility[index] ?? null,
      windSpeed: forecast.hourly.wind_speed_10m[index] ?? null,
      windDirection: forecast.hourly.wind_direction_10m[index] ?? null,
      windGusts: forecast.hourly.wind_gusts_10m[index] ?? null,
      cape: forecast.hourly.cape[index] ?? null,
      uvIndex:
        airIndex === undefined ? null : air.hourly.uv_index[airIndex] ?? null,
      europeanAqi:
        airIndex === undefined
          ? null
          : air.hourly.european_aqi[airIndex] ?? null,
      usAqi:
        airIndex === undefined ? null : air.hourly.us_aqi[airIndex] ?? null,
      pm10: airIndex === undefined ? null : air.hourly.pm10[airIndex] ?? null,
      pm25: airIndex === undefined ? null : air.hourly.pm2_5[airIndex] ?? null,
      isDay:
        forecast.hourly.is_day[index] === null
          ? null
          : forecast.hourly.is_day[index] === 1,
    } satisfies WeatherSample;
  });

  const ranked = samples
    .filter((sample) => sample.isDay !== false)
    .map((sample) => ({ sample, verdict: evaluateFlight(sample) }))
    .sort((a, b) => b.verdict.score - a.verdict.score);
  const best = ranked[0] ?? {
    sample: null,
    verdict: {
      status: "no-go" as const,
      title: "Nu exista fereastra de lumina",
      score: 0,
      reasons: ["Prognoza nu a returnat ore cu lumina naturala pentru data selectata."],
      cautions: [],
    },
  };

  return {
    date,
    location,
    timezone: forecast.timezone,
    daily: {
      weatherCode: forecast.daily.weather_code[0] ?? null,
      weatherLabel: weatherCodeLabel(forecast.daily.weather_code[0]),
      temperatureMax: forecast.daily.temperature_2m_max[0] ?? null,
      temperatureMin: forecast.daily.temperature_2m_min[0] ?? null,
      precipitationSum: forecast.daily.precipitation_sum[0] ?? null,
      precipitationProbabilityMax:
        forecast.daily.precipitation_probability_max[0] ?? null,
      windSpeedMax: forecast.daily.wind_speed_10m_max[0] ?? null,
      windGustsMax: forecast.daily.wind_gusts_10m_max[0] ?? null,
      uvIndexMax: forecast.daily.uv_index_max[0] ?? null,
      sunrise: forecast.daily.sunrise[0] ?? null,
      sunset: forecast.daily.sunset[0] ?? null,
    },
    samples,
    best,
    topWindows: ranked
      .filter((entry) => entry.verdict.status !== "no-go")
      .slice(0, 4),
    sources: ["Open-Meteo Forecast", "Open-Meteo Air Quality"],
  };
}

export function evaluateFlight(sample: WeatherSample): FlightVerdict {
  let score = 100;
  const hard: string[] = [];
  const cautions: string[] = [];
  const gustSpread =
    sample.windSpeed !== null && sample.windGusts !== null
      ? sample.windGusts - sample.windSpeed
      : null;

  const noGo = (reason: string, penalty: number) => {
    hard.push(reason);
    score -= penalty;
  };
  const caution = (reason: string, penalty: number) => {
    cautions.push(reason);
    score -= penalty;
  };

  if (sample.isDay === false) noGo("Nu este lumină naturală la zona de zbor.", 45);
  if (sample.windSpeed === null) noGo("Viteza vântului nu este disponibilă.", 35);
  else if (sample.windSpeed < 4) noGo("Vântul este prea slab pentru o lansare previzibilă la picior.", 30);
  else if (sample.windSpeed < 8) caution("Vântul este slab și poate deveni variabil.", 12);
  else if (sample.windSpeed > 28) noGo("Vântul susținut depășește o limită conservatoare pentru parapantă.", 40);
  else if (sample.windSpeed > 22) caution("Vântul susținut este aproape de limita superioară de confort.", 18);

  if (sample.windGusts === null) caution("Datele despre rafale nu sunt disponibile.", 10);
  else if (sample.windGusts > 35) noGo("Rafalele sunt prea puternice pentru o decizie conservatoare de lansare.", 38);
  else if (sample.windGusts > 28) caution("Rafalele sunt ridicate.", 16);

  if (gustSpread !== null && gustSpread > 16) noGo("Diferența dintre vânt și rafale este mare, semn de aer turbulent sau instabil.", 32);
  else if (gustSpread !== null && gustSpread > 10) caution("Diferența dintre vânt și rafale merită atenție.", 14);

  if (sample.precipitation !== null && sample.precipitation >= 0.2) noGo("Sunt precipitații active.", 35);
  if (sample.precipitationProbability !== null && sample.precipitationProbability >= 45) noGo("Probabilitatea de precipitații este ridicată.", 25);
  else if (sample.precipitationProbability !== null && sample.precipitationProbability >= 25) caution("Riscul de ploaie este relevant.", 12);

  if (sample.weatherCode !== null) {
    if (sample.weatherCode >= 95) noGo("Există risc de furtună.", 45);
    else if (sample.weatherCode >= 71 || sample.weatherCode === 65) noGo("Prognoza include precipitații puternice sau ninsoare.", 30);
    else if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 66, 67, 80, 81, 82].includes(sample.weatherCode)) caution(`${sample.weatherLabel} poate reduce siguranța lansării.`, 12);
  }

  if (sample.visibility !== null && sample.visibility < 5000) noGo("Vizibilitatea este sub 5 km.", 30);
  else if (sample.visibility !== null && sample.visibility < 10000) caution("Vizibilitatea este sub 10 km.", 10);

  if (sample.cape !== null && sample.cape > 1500) noGo("CAPE este ridicat, cu risc de instabilitate convectivă.", 35);
  else if (sample.cape !== null && sample.cape > 800) caution("CAPE sugerează dezvoltare convectivă posibilă.", 14);

  if (sample.cloudCover !== null && sample.cloudCover > 90) caution("Acoperirea noroasă este foarte mare.", 8);
  if (sample.usAqi !== null && sample.usAqi > 200) noGo("Calitatea aerului este foarte slabă.", 25);
  else if (sample.usAqi !== null && sample.usAqi > 150) caution("Calitatea aerului este nesănătoasă pentru efort prelungit.", 10);
  if (sample.uvIndex !== null && sample.uvIndex >= 8) caution("Expunerea UV este ridicată.", 6);

  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  if (hard.length > 0) {
    return {
      status: "no-go",
      title: "Nu e parapantabil",
      score: Math.min(safeScore, 44),
      reasons: hard,
      cautions,
    };
  }

  if (cautions.length > 0 || safeScore < 78) {
    return {
      status: "marginal",
      title: "La limită",
      score: Math.min(safeScore, 74),
      reasons: cautions.slice(0, 3),
      cautions: cautions.slice(3),
    };
  }

  return {
    status: "good",
    title: "Parapantabil",
    score: safeScore,
    reasons: ["Vântul, rafalele, precipitațiile, vizibilitatea și instabilitatea arată acceptabil."],
    cautions,
  };
}

export function dateForOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatTime(value: string | null, timezone?: string) {
  if (!value) return "n/d";
  const isOffsetTimestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const localTime = value.match(/T(\d{2}):(\d{2})/);

  if (localTime && !isOffsetTimestamp) {
    const [, hour, minute] = localTime;
    return new Intl.DateTimeFormat("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(2000, 0, 1, Number(hour), Number(minute)));
  }

  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}

export function windDirectionLabel(degrees: number | null) {
  if (degrees === null) return "n/d";
  return ["N", "NE", "E", "SE", "S", "SV", "V", "NV"][
    Math.round(degrees / 45) % 8
  ];
}

export function numberLabel(value: number | null, unit: string, digits = 0) {
  if (value === null || Number.isNaN(value)) return "n/d";
  const label = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  const normalizedUnit =
    unit === "C" ? "°C" : unit === "ug/m3" ? "µg/m³" : unit;
  return `${label}${normalizedUnit ? ` ${normalizedUnit}` : ""}`;
}

export function percentLabel(value: number | null) {
  return value === null ? "n/d" : `${Math.round(value)}%`;
}

export function statusColor(status: FlightStatus) {
  if (status === "good") return "#4dffa5";
  if (status === "marginal") return "#ffd166";
  return "#ff5c7a";
}

export function weatherCodeLabel(code: number | null | undefined) {
  switch (code) {
    case 0:
      return "Cer senin";
    case 1:
      return "Predominant senin";
    case 2:
      return "Parțial noros";
    case 3:
      return "Înnorat";
    case 45:
    case 48:
      return "Ceață";
    case 51:
    case 53:
    case 55:
      return "Burniță";
    case 56:
    case 57:
      return "Burniță înghețată";
    case 61:
    case 63:
      return "Ploaie";
    case 65:
      return "Ploaie puternică";
    case 66:
    case 67:
      return "Ploaie înghețată";
    case 71:
    case 73:
    case 75:
      return "Ninsoare";
    case 77:
      return "Grăunțe de zăpadă";
    case 80:
    case 81:
    case 82:
      return "Averse";
    case 85:
    case 86:
      return "Averse de zăpadă";
    case 95:
      return "Furtună";
    case 96:
    case 99:
      return "Furtună cu grindină";
    default:
      return "Cod meteo indisponibil";
  }
}
