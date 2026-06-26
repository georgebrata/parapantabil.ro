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
    time: z.string(),
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
    throw new Error(`Weather service returned ${response.status}`);
  }

  const payload = await response.json();
  return schema.parse(payload);
}

function buildForecastUrl(
  location: LocationChoice,
  params: Record<string, string>,
) {
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

function buildAirUrl(location: LocationChoice, params: Record<string, string>) {
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
    language: "en",
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
  const current = [
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
  ].join(",");

  const [forecast, air] = await Promise.all([
    requestJson(
      buildForecastUrl(location, {
        current,
      }),
      CurrentForecastSchema,
    ),
    requestJson(
      buildAirUrl(location, {
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
  const hourly = [
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
  ].join(",");
  const daily = [
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
  ].join(",");

  const [forecast, air] = await Promise.all([
    requestJson(
      buildForecastUrl(location, {
        start_date: date,
        end_date: date,
        hourly,
        daily,
      }),
      ForecastDaySchema,
    ),
    requestJson(
      buildAirUrl(location, {
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
      title: "No daylight forecast available",
      score: 0,
      reasons: ["No daylight sample was returned for this date."],
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

  const noGo = (reason: string, penalty: number) => {
    hard.push(reason);
    score -= penalty;
  };
  const caution = (reason: string, penalty: number) => {
    cautions.push(reason);
    score -= penalty;
  };

  const gustSpread =
    sample.windSpeed !== null && sample.windGusts !== null
      ? sample.windGusts - sample.windSpeed
      : null;

  if (sample.isDay === false) {
    noGo("It is not daylight at the site.", 45);
  }

  if (sample.windSpeed === null) {
    noGo("Wind speed is unavailable.", 35);
  } else if (sample.windSpeed < 4) {
    noGo("Wind is too light for a dependable foot launch.", 30);
  } else if (sample.windSpeed < 8) {
    caution("Wind is light and may be variable.", 12);
  } else if (sample.windSpeed > 28) {
    noGo("Sustained wind is above a conservative manual paraglider limit.", 40);
  } else if (sample.windSpeed > 22) {
    caution("Sustained wind is near the upper comfort range.", 18);
  }

  if (sample.windGusts === null) {
    caution("Gust data is unavailable.", 10);
  } else if (sample.windGusts > 35) {
    noGo("Gusts are too strong for a conservative launch decision.", 38);
  } else if (sample.windGusts > 28) {
    caution("Gusts are elevated.", 16);
  }

  if (gustSpread !== null) {
    if (gustSpread > 16) {
      noGo("Gust spread is large, suggesting turbulent or unstable air.", 32);
    } else if (gustSpread > 10) {
      caution("Gust spread is noticeable.", 14);
    }
  }

  if (sample.precipitation !== null && sample.precipitation >= 0.2) {
    noGo("Precipitation is present.", 35);
  }

  if (
    sample.precipitationProbability !== null &&
    sample.precipitationProbability >= 45
  ) {
    noGo("Precipitation probability is high.", 25);
  } else if (
    sample.precipitationProbability !== null &&
    sample.precipitationProbability >= 25
  ) {
    caution("Rain risk is meaningful.", 12);
  }

  if (sample.weatherCode !== null) {
    if (sample.weatherCode >= 95) {
      noGo("Thunderstorm risk is present.", 45);
    } else if (sample.weatherCode >= 71 || sample.weatherCode === 65) {
      noGo("The forecast includes heavy precipitation or snow.", 30);
    } else if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 66, 67, 80, 81, 82].includes(sample.weatherCode)) {
      caution(`${sample.weatherLabel} may reduce launch safety.`, 12);
    }
  }

  if (sample.visibility !== null) {
    if (sample.visibility < 5000) {
      noGo("Visibility is below 5 km.", 30);
    } else if (sample.visibility < 10000) {
      caution("Visibility is below 10 km.", 10);
    }
  }

  if (sample.cape !== null) {
    if (sample.cape > 1500) {
      noGo("CAPE is high, raising convective instability risk.", 35);
    } else if (sample.cape > 800) {
      caution("CAPE suggests possible convective development.", 14);
    }
  }

  if (sample.cloudCover !== null && sample.cloudCover > 90) {
    caution("Cloud cover is very high.", 8);
  }

  if (sample.usAqi !== null) {
    if (sample.usAqi > 200) {
      noGo("Air quality is very poor.", 25);
    } else if (sample.usAqi > 150) {
      caution("Air quality is unhealthy for prolonged exertion.", 10);
    }
  }

  if (sample.uvIndex !== null && sample.uvIndex >= 8) {
    caution("UV exposure is high.", 6);
  }

  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  if (hard.length > 0) {
    return {
      status: "no-go",
      title: "Do not fly",
      score: Math.min(safeScore, 44),
      reasons: hard,
      cautions,
    };
  }

  if (cautions.length > 0 || safeScore < 78) {
    return {
      status: "marginal",
      title: "Marginal",
      score: Math.min(safeScore, 74),
      reasons: cautions.slice(0, 3),
      cautions: cautions.slice(3),
    };
  }

  return {
    status: "good",
    title: "Looks flyable",
    score: safeScore,
    reasons: ["Wind, gusts, precipitation, visibility, and instability checks look acceptable."],
    cautions,
  };
}

export function dateForOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatTime(value: string | null, timezone?: string) {
  if (!value) {
    return "n/a";
  }

  const isOffsetTimestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const localTime = value.match(/T(\d{2}):(\d{2})/);

  if (localTime && !isOffsetTimestamp) {
    const [, hour, minute] = localTime;
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(2000, 0, 1, Number(hour), Number(minute)));
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function windDirectionLabel(degrees: number | null) {
  if (degrees === null) {
    return "n/a";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

export function numberLabel(
  value: number | null,
  unit: string,
  digits = 0,
): string {
  if (value === null || Number.isNaN(value)) {
    return "n/a";
  }

  return `${value.toFixed(digits)} ${unit}`;
}

export function percentLabel(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value)}%`;
}

export function statusColor(status: FlightStatus) {
  if (status === "good") {
    return "#15803d";
  }

  if (status === "marginal") {
    return "#b45309";
  }

  return "#b91c1c";
}

export function weatherCodeLabel(code: number | null | undefined) {
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
      return "Rain";
    case 65:
      return "Heavy rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snowfall";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Weather code unavailable";
  }
}
